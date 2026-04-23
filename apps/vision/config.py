# =============================================================
# config.py — Configurações do módulo de visão
# Copie para .env e ajuste os valores
# =============================================================

import os
from dotenv import load_dotenv

load_dotenv()

# ── Câmera ────────────────────────────────────────────────────
# 0 = câmera padrão do sistema (notebook/USB)
# "rtsp://..." para câmeras IP
CAMERA_SOURCE: int | str = int(os.getenv("CAMERA_SOURCE", "0"))

# Resolução de captura (px)
FRAME_WIDTH  = int(os.getenv("FRAME_WIDTH",  "1280"))
FRAME_HEIGHT = int(os.getenv("FRAME_HEIGHT", "720"))

# ── Modelo YOLOv8 ─────────────────────────────────────────────
# yolov8n.pt = nano (mais rápido, menor precisão)
# yolov8s.pt = small (bom equilíbrio — recomendado)
YOLO_MODEL   = os.getenv("YOLO_MODEL", "yolov8n.pt")
CONFIDENCE   = float(os.getenv("CONFIDENCE", "0.45"))   # 0–1
DEVICE       = os.getenv("DEVICE", "cpu")               # "cpu" | "cuda" | "mps"

# ── Linha virtual de contagem ─────────────────────────────────
# Define os dois pontos da linha no espaço normalizado [0..1]
# (0,0) = canto superior esquerdo do frame
# Para uma linha horizontal no meio da porta:
LINE_START_X = float(os.getenv("LINE_START_X", "0.0"))
LINE_START_Y = float(os.getenv("LINE_START_Y", "0.5"))
LINE_END_X   = float(os.getenv("LINE_END_X",   "1.0"))
LINE_END_Y   = float(os.getenv("LINE_END_Y",   "0.5"))

# ── API Pulso Cultural ────────────────────────────────────────
API_BASE_URL  = os.getenv("API_BASE_URL", "https://pulso-api-backend-production.up.railway.app")
CAMERA_API_KEY = os.getenv("CAMERA_API_KEY", "")         # chave registrada no dashboard
CAMERA_ID      = os.getenv("CAMERA_ID", "")              # ID da câmera cadastrada
EXHIBITION_ID  = os.getenv("EXHIBITION_ID", "")          # ID da exposição ativa

# Intervalo de envio para a API (segundos)
SEND_INTERVAL = int(os.getenv("SEND_INTERVAL", "60"))

# ── Armazenamento local ────────────────────────────────────────
SQLITE_DB = os.getenv("SQLITE_DB", "counts.db")

# ── Debug ──────────────────────────────────────────────────────
SHOW_WINDOW  = os.getenv("SHOW_WINDOW", "true").lower() == "true"
SHOW_OVERLAY = os.getenv("SHOW_OVERLAY", "true").lower() == "true"
