#!/usr/bin/env python3
# =============================================================
# counter.py — Módulo de contagem de pessoas por câmera
# Pulso Cultural · MAM Bahia
#
# Arquitetura:
#   Câmera → OpenCV → YOLOv8 (detecção) → ByteTracker (tracking)
#   → LineZone (contagem entrada/saída) → SQLite + API
#
# LGPD:
#   ✅ Processa localmente
#   ✅ Envia apenas números (entries, exits)
#   ✅ Nunca salva frames, nunca identifica pessoas
#   ✅ Nenhum dado biométrico coletado
# =============================================================

import sys
import signal
import logging
import argparse
from datetime import datetime

import cv2
import numpy as np
import supervision as sv
from ultralytics import YOLO

import config
from store import init_db, SyncWorker

# ── Logging ───────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("counter")


# ── Helpers ───────────────────────────────────────────────────
def build_line(width: int, height: int) -> sv.LineZone:
    """
    Converte coordenadas normalizadas [0..1] em pixels
    e cria a linha virtual de contagem.

    Orientação padrão:
        IN  = pessoa cruza de cima para baixo (entra)
        OUT = pessoa cruza de baixo para cima (sai)

    Ajuste LINE_START_* / LINE_END_* no .env conforme a posição da câmera.
    """
    start = sv.Point(
        x=int(config.LINE_START_X * width),
        y=int(config.LINE_START_Y * height),
    )
    end = sv.Point(
        x=int(config.LINE_END_X * width),
        y=int(config.LINE_END_Y * height),
    )
    return sv.LineZone(start=start, end=end)


def run(camera_source: int | str = config.CAMERA_SOURCE) -> None:
    # ── Câmera ────────────────────────────────────────────────
    log.info("Abrindo câmera: %s", camera_source)
    cap = cv2.VideoCapture(camera_source)
    if not cap.isOpened():
        log.error("Não foi possível abrir a câmera '%s'", camera_source)
        sys.exit(1)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  config.FRAME_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, config.FRAME_HEIGHT)

    actual_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    actual_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    log.info("Resolução: %dx%d", actual_w, actual_h)

    # ── Modelo YOLOv8 ─────────────────────────────────────────
    log.info("Carregando modelo: %s", config.YOLO_MODEL)
    model = YOLO(config.YOLO_MODEL)

    # Classe 0 = "person" no dataset COCO
    PERSON_CLASS_ID = 0

    # ── Tracker ByteTracker (melhor que SORT para oclusão) ────
    tracker = sv.ByteTracker(
        track_activation_threshold=0.25,
        lost_track_buffer=30,
        minimum_matching_threshold=0.8,
        frame_rate=30,
    )

    # ── Linha virtual ─────────────────────────────────────────
    line_zone = build_line(actual_w, actual_h)

    # ── Anotadores visuais (apenas para debug) ────────────────
    box_annotator  = sv.BoxAnnotator(thickness=2)
    line_annotator = sv.LineZoneAnnotator(
        thickness=3,
        text_thickness=2,
        text_scale=1.2,
    )

    # ── Banco local + worker de sincronização ─────────────────
    db   = init_db()
    sync = SyncWorker(db)
    sync.start()

    # Contadores da sessão atual
    session_entries = 0
    session_exits   = 0
    # Snapshot anterior para calcular deltas enviados ao SyncWorker
    prev_in  = 0
    prev_out = 0

    # ── Tratamento de sinal para desligar limpo ────────────────
    running = [True]
    def on_signal(sig, _frame):
        log.info("Sinal %s recebido — encerrando...", sig)
        running[0] = False
    signal.signal(signal.SIGINT,  on_signal)
    signal.signal(signal.SIGTERM, on_signal)

    log.info("Iniciando contagem. Pressione [ESC] para sair.")

    while running[0]:
        ret, frame = cap.read()
        if not ret:
            log.warning("Frame perdido — reconectando...")
            cap.release()
            cap = cv2.VideoCapture(camera_source)
            continue

        # ── Detecção YOLOv8 (apenas classe person) ────────────
        results = model(
            frame,
            classes=[PERSON_CLASS_ID],
            conf=config.CONFIDENCE,
            device=config.DEVICE,
            verbose=False,
        )[0]

        # Converte para formato supervision
        detections = sv.Detections.from_ultralytics(results)

        # Filtra apenas pessoas (redundante, mas seguro)
        detections = detections[detections.class_id == PERSON_CLASS_ID]

        # ── Tracking ByteTracker ───────────────────────────────
        detections = tracker.update_with_detections(detections)

        # ── Atualiza linha de contagem ─────────────────────────
        line_zone.trigger(detections)

        # Calcula deltas (novos eventos desde última checagem)
        curr_in  = line_zone.in_count
        curr_out = line_zone.out_count
        delta_in  = curr_in  - prev_in
        delta_out = curr_out - prev_out

        if delta_in > 0 or delta_out > 0:
            session_entries += delta_in
            session_exits   += delta_out
            log.info("📊 Entrada: %d (+%d) | Saída: %d (+%d)",
                     session_entries, delta_in, session_exits, delta_out)
            # Enfileira para o SyncWorker enviar em lote
            sync.push(delta_in, delta_out)

        prev_in  = curr_in
        prev_out = curr_out

        # ── Visualização (desligável via SHOW_WINDOW=false) ────
        if config.SHOW_WINDOW:
            if config.SHOW_OVERLAY:
                labels = [
                    f"#{tid}" for tid in (detections.tracker_id or [])
                ]
                frame = box_annotator.annotate(frame, detections, labels=labels)
                frame = line_annotator.annotate(frame, line_zone)

                # HUD — contadores da sessão
                ts_str = datetime.now().strftime("%H:%M:%S")
                hud = [
                    f"PULSO CULTURAL · {ts_str}",
                    f"Entradas: {session_entries}",
                    f"Saidas:   {session_exits}",
                    f"Pessoas:  {len(detections)}",
                ]
                for i, line_text in enumerate(hud):
                    cv2.putText(
                        frame, line_text,
                        (12, 32 + i * 28),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                        (255, 255, 255), 2, cv2.LINE_AA,
                    )

            cv2.imshow("Pulso Cultural — Câmera", frame)
            if cv2.waitKey(1) == 27:   # ESC
                break

    # ── Limpeza ────────────────────────────────────────────────
    log.info("Encerrando — sessão: %d entradas, %d saídas",
             session_entries, session_exits)
    sync.stop()
    cap.release()
    cv2.destroyAllWindows()
    db.close()
    log.info("OK.")


# ── CLI ───────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Pulso Cultural — Contador de pessoas por câmera"
    )
    parser.add_argument(
        "--camera", default=None,
        help="Índice da câmera (0, 1…) ou URL RTSP. Padrão: CAMERA_SOURCE do .env"
    )
    parser.add_argument(
        "--model", default=None,
        help="Modelo YOLOv8 (yolov8n.pt, yolov8s.pt…). Padrão: YOLO_MODEL do .env"
    )
    args = parser.parse_args()

    if args.camera is not None:
        try:
            config.CAMERA_SOURCE = int(args.camera)
        except ValueError:
            config.CAMERA_SOURCE = args.camera  # URL string

    if args.model is not None:
        config.YOLO_MODEL = args.model

    run()
