#!/usr/bin/env python3
"""
=================================================================
demo.py — Demonstração de contagem de pessoas · Pulso Cultural
=================================================================

USO RÁPIDO (sem instalar nada além do pip):
  pip install ultralytics opencv-python supervision
  python demo.py

Pressione:
  ESC  → sair
  R    → resetar contadores
  L    → mover linha para cima/baixo (ajuste ao vivo)
  S    → salvar screenshot
=================================================================
"""

import cv2
import sys
import time
import argparse
from datetime import datetime
from pathlib import Path

# ── Tenta importar supervision/ultralytics ────────────────────
try:
    import supervision as sv
    from ultralytics import YOLO
    HAS_DEPS = True
except ImportError:
    HAS_DEPS = False


def check_deps():
    if not HAS_DEPS:
        print("\n❌ Dependências faltando. Instale com:")
        print("   pip install ultralytics opencv-python supervision\n")
        sys.exit(1)


def draw_hud(frame, entries: int, exits: int, total_now: int,
             fps: float, line_y: float, paused: bool = False):
    """Desenha o painel de informações sobre o frame."""
    h, w = frame.shape[:2]
    ts = datetime.now().strftime("%H:%M:%S")

    # Fundo semitransparente no topo
    overlay = frame.copy()
    cv2.rectangle(overlay, (0, 0), (w, 90), (17, 13, 16), -1)
    cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)

    # Linha virtual (ajustável)
    line_px = int(line_y * h)
    cv2.line(frame, (0, line_px), (w, line_px), (80, 160, 255), 2)
    cv2.putText(frame, "LINHA DE CONTAGEM", (10, line_px - 8),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (80, 160, 255), 1, cv2.LINE_AA)

    # Setas indicando direção
    cv2.arrowedLine(frame, (w - 60, line_px + 20), (w - 60, line_px + 50),
                    (100, 230, 100), 2, tipLength=0.4)
    cv2.arrowedLine(frame, (w - 30, line_px - 20), (w - 30, line_px - 50),
                    (100, 100, 230), 2, tipLength=0.4)
    cv2.putText(frame, "ENTRA", (w - 90, line_px + 65),
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (100, 230, 100), 1)
    cv2.putText(frame, "SAI",   (w - 60, line_px - 55),
                cv2.FONT_HERSHEY_SIMPLEX, 0.4, (100, 100, 230), 1)

    # HUD principal
    items = [
        (f"PULSO CULTURAL  ·  {ts}", (255, 255, 255), 0.65),
        (f"Entradas: {entries:>4}   Saídas: {exits:>4}   Agora: {total_now:>3}", (200, 200, 200), 0.60),
        (f"FPS: {fps:4.1f}   Linha: {line_y:.2f}   [ESC] sair  [R] reset  [L] linha  [S] screenshot",
         (140, 140, 140), 0.42),
    ]
    for i, (text, color, scale) in enumerate(items):
        cv2.putText(frame, text, (12, 22 + i * 24),
                    cv2.FONT_HERSHEY_SIMPLEX, scale, color, 1, cv2.LINE_AA)

    if paused:
        cv2.putText(frame, "⏸ PAUSADO", (w // 2 - 60, h // 2),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 200, 255), 2, cv2.LINE_AA)

    # Pulso badge (canto inferior direito)
    badge_text = "● AO VIVO" if not paused else "● PAUSADO"
    badge_color = (50, 200, 50) if not paused else (0, 150, 220)
    cv2.putText(frame, badge_text, (w - 130, h - 15),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, badge_color, 1, cv2.LINE_AA)

    return frame


def run_demo(camera_idx: int = 0, model_name: str = "yolov8n.pt",
             show_boxes: bool = True, send_api: bool = False,
             api_url: str = ""):

    check_deps()

    # ── Câmera ─────────────────────────────────────────────────
    print(f"📷  Abrindo câmera {camera_idx}...")
    cap = cv2.VideoCapture(camera_idx)
    if not cap.isOpened():
        print(f"❌  Câmera {camera_idx} não disponível")
        sys.exit(1)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    print(f"✅  Câmera aberta: {w}x{h}")

    # ── Modelo ─────────────────────────────────────────────────
    print(f"🤖  Carregando {model_name} (pode baixar ~6MB na 1ª vez)...")
    model = YOLO(model_name)
    tracker = sv.ByteTracker(track_activation_threshold=0.25, lost_track_buffer=30,
                              minimum_matching_threshold=0.8, frame_rate=30)
    box_ann  = sv.BoxAnnotator(thickness=2)
    label_ann = sv.LabelAnnotator(text_scale=0.5, text_thickness=1)

    # ── Linha virtual (posição 0..1 no eixo Y) ─────────────────
    line_y = 0.5  # começa no meio — ajustável com tecla L

    def make_line():
        return sv.LineZone(
            start=sv.Point(0,       int(line_y * h)),
            end  =sv.Point(w - 1,   int(line_y * h)),
        )

    line_zone = make_line()
    line_ann  = sv.LineZoneAnnotator(thickness=2, text_thickness=1, text_scale=0.6)

    # ── Contadores ─────────────────────────────────────────────
    entries = 0
    exits   = 0
    prev_in = 0
    prev_out = 0

    # ── FPS ────────────────────────────────────────────────────
    fps_counter = 0
    fps_ts      = time.time()
    fps         = 0.0

    print("\n🎬  Iniciando. Pressione [ESC] para sair.\n")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # ── Detecção (apenas class 0 = person) ────────────────
        results = model(frame, classes=[0], conf=0.45, verbose=False)[0]
        dets    = sv.Detections.from_ultralytics(results)
        dets    = dets[dets.class_id == 0]
        dets    = tracker.update_with_detections(dets)

        # ── Contagem por cruzamento de linha ───────────────────
        line_zone.trigger(dets)

        d_in  = line_zone.in_count  - prev_in
        d_out = line_zone.out_count - prev_out
        if d_in > 0 or d_out > 0:
            entries += d_in
            exits   += d_out
            prev_in  = line_zone.in_count
            prev_out = line_zone.out_count
            ts = datetime.now().strftime("%H:%M:%S")
            print(f"[{ts}] +{d_in} entrada(s) · -{d_out} saída(s) "
                  f"| Total: {entries} entradas, {exits} saídas")

            # Envio opcional para API (modo demo)
            if send_api and api_url:
                try:
                    import requests
                    requests.post(api_url, json={"entries": d_in, "exits": d_out},
                                  timeout=3)
                    print("       ↑ enviado para API")
                except Exception as e:
                    print(f"       ⚠ API indisponível: {e}")

        # ── Anotações visuais ──────────────────────────────────
        if show_boxes and len(dets) > 0:
            labels = [f"#{tid}" for tid in (dets.tracker_id or [])]
            frame  = box_ann.annotate(frame, dets)
            frame  = label_ann.annotate(frame, dets, labels=labels)
            frame  = line_ann.annotate(frame, line_zone)

        # ── HUD ───────────────────────────────────────────────
        fps_counter += 1
        if time.time() - fps_ts >= 1.0:
            fps        = fps_counter / (time.time() - fps_ts)
            fps_counter = 0
            fps_ts      = time.time()

        frame = draw_hud(frame, entries, exits, len(dets), fps, line_y)
        cv2.imshow("Pulso Cultural — Demo Câmera", frame)

        # ── Teclas ────────────────────────────────────────────
        key = cv2.waitKey(1) & 0xFF
        if key == 27:   # ESC
            break
        elif key == ord('r') or key == ord('R'):
            entries = exits = prev_in = prev_out = 0
            line_zone = make_line()
            print("↺  Contadores resetados")
        elif key == ord('l') or key == ord('L'):
            line_y = min(0.9, line_y + 0.05)
            line_zone = make_line()
        elif key == ord('u') or key == ord('U'):
            line_y = max(0.1, line_y - 0.05)
            line_zone = make_line()
        elif key == ord('s') or key == ord('S'):
            fname = f"pulso_demo_{datetime.now().strftime('%H%M%S')}.jpg"
            cv2.imwrite(fname, frame)
            print(f"📸  Screenshot: {fname}")

    # ── Relatório final ────────────────────────────────────────
    cap.release()
    cv2.destroyAllWindows()
    print(f"\n{'='*45}")
    print(f"  RELATÓRIO DA SESSÃO")
    print(f"{'='*45}")
    print(f"  Entradas registradas:  {entries:>6}")
    print(f"  Saídas  registradas:   {exits:>6}")
    print(f"  Fluxo líquido:         {entries - exits:>+6}")
    print(f"{'='*45}\n")


# ── CLI ───────────────────────────────────────────────────────
if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Pulso Cultural — Demo de câmera")
    p.add_argument("--camera",   type=int,  default=0,
                   help="Índice da câmera (0=padrão, 1=USB externa)")
    p.add_argument("--model",    default="yolov8n.pt",
                   help="Modelo YOLO: yolov8n.pt (rápido) ou yolov8s.pt (melhor)")
    p.add_argument("--no-boxes", action="store_true",
                   help="Oculta caixas de detecção (mais limpo para apresentação)")
    p.add_argument("--send-api", action="store_true",
                   help="Ativa envio para API (requer --api-url)")
    p.add_argument("--api-url",  default="",
                   help="URL do endpoint: https://pulso-api-backend.../camera/counts")
    args = p.parse_args()

    run_demo(
        camera_idx = args.camera,
        model_name = args.model,
        show_boxes = not args.no_boxes,
        send_api   = args.send_api,
        api_url    = args.api_url,
    )
