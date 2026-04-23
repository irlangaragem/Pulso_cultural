# =============================================================
# store.py — Armazenamento local com SQLite + envio para API
# LGPD: armazena apenas contagens numéricas, nunca imagens
# =============================================================

import sqlite3
import time
import logging
import requests
from datetime import datetime, timezone
from threading import Thread, Event
from queue import Queue, Empty

import config

log = logging.getLogger(__name__)


# ── SQLite local ──────────────────────────────────────────────
def init_db(path: str = config.SQLITE_DB) -> sqlite3.Connection:
    """Cria/abre o banco de contagens locais."""
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS counts (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp   TEXT    NOT NULL,
            entries     INTEGER NOT NULL DEFAULT 0,
            exits       INTEGER NOT NULL DEFAULT 0,
            camera_id   TEXT,
            exhibition_id TEXT,
            synced      INTEGER NOT NULL DEFAULT 0  -- 0=pendente, 1=enviado
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_synced ON counts(synced)")
    conn.commit()
    return conn


def save_count(conn: sqlite3.Connection, entries: int, exits: int,
               ts: datetime | None = None) -> int:
    """Salva uma contagem local e retorna o ID."""
    ts = ts or datetime.now(timezone.utc)
    cur = conn.execute(
        "INSERT INTO counts(timestamp, entries, exits, camera_id, exhibition_id) VALUES (?,?,?,?,?)",
        (ts.isoformat(), entries, exits, config.CAMERA_ID, config.EXHIBITION_ID)
    )
    conn.commit()
    return cur.lastrowid


def mark_synced(conn: sqlite3.Connection, row_id: int) -> None:
    conn.execute("UPDATE counts SET synced=1 WHERE id=?", (row_id,))
    conn.commit()


def get_pending(conn: sqlite3.Connection) -> list[dict]:
    """Retorna contagens não enviadas à API."""
    rows = conn.execute(
        "SELECT id, timestamp, entries, exits, camera_id, exhibition_id "
        "FROM counts WHERE synced=0 ORDER BY id"
    ).fetchall()
    return [
        {"id": r[0], "timestamp": r[1], "entries": r[2],
         "exits": r[3], "camera_id": r[4], "exhibition_id": r[5]}
        for r in rows
    ]


# ── Envio para a API ──────────────────────────────────────────
def send_count(entries: int, exits: int, timestamp: str) -> bool:
    """
    POST /camera/counts com autenticação via CAMERA_API_KEY.
    Retorna True em caso de sucesso.
    LGPD: envia apenas números, nunca frames ou dados pessoais.
    """
    if not config.CAMERA_ID or not config.CAMERA_API_KEY:
        log.warning("CAMERA_ID ou CAMERA_API_KEY não configurados — envio ignorado")
        return False

    url = f"{config.API_BASE_URL.rstrip('/')}/camera/counts"
    payload = {
        "cameraId":    config.CAMERA_ID,
        "exhibitionId": config.EXHIBITION_ID or None,
        "entries":     entries,
        "exits":       exits,
        "timestamp":   timestamp,
    }
    headers = {"X-Camera-Key": config.CAMERA_API_KEY, "Content-Type": "application/json"}

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        resp.raise_for_status()
        log.info("✅ Enviado: +%d entradas, -%d saídas", entries, exits)
        return True
    except requests.RequestException as exc:
        log.warning("⚠️  Falha ao enviar (%s) — será tentado novamente", exc)
        return False


# ── Worker de sincronização em background ─────────────────────
class SyncWorker:
    """
    Acumula contagens durante SEND_INTERVAL segundos,
    salva localmente e envia para a API em lote.
    Continua funcionando offline — envia pendências quando a rede volta.
    """

    def __init__(self, conn: sqlite3.Connection):
        self._conn   = conn
        self._queue: Queue[tuple[int, int]] = Queue()
        self._stop   = Event()
        self._thread = Thread(target=self._run, daemon=True, name="SyncWorker")

    def push(self, entries: int, exits: int) -> None:
        """Enfileira incrementos de contagem (thread-safe)."""
        self._queue.put((entries, exits))

    def start(self) -> None:
        self._thread.start()
        log.info("SyncWorker iniciado (intervalo: %ds)", config.SEND_INTERVAL)

    def stop(self) -> None:
        self._stop.set()
        self._thread.join(timeout=5)

    def _run(self) -> None:
        while not self._stop.is_set():
            # Acumula durante o intervalo configurado
            batch_entries = 0
            batch_exits   = 0
            deadline = time.monotonic() + config.SEND_INTERVAL

            while time.monotonic() < deadline and not self._stop.is_set():
                try:
                    e, x = self._queue.get(timeout=1)
                    batch_entries += e
                    batch_exits   += x
                except Empty:
                    pass

            if batch_entries == 0 and batch_exits == 0:
                # Tenta sincronizar pendências mesmo sem novos dados
                self._flush_pending()
                continue

            ts  = datetime.now(timezone.utc).isoformat()
            rid = save_count(self._conn, batch_entries, batch_exits)
            log.info("💾 Salvo local id=%d: +%d / -%d", rid, batch_entries, batch_exits)

            ok = send_count(batch_entries, batch_exits, ts)
            if ok:
                mark_synced(self._conn, rid)

            self._flush_pending()

    def _flush_pending(self) -> None:
        """Re-envia registros que não foram sincronizados anteriormente."""
        for row in get_pending(self._conn):
            ok = send_count(row["entries"], row["exits"], row["timestamp"])
            if ok:
                mark_synced(self._conn, row["id"])
