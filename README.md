# Pulso Cultural — Antigravity Handoff Package

**Garagem (garagem.dev)** · MVP 1.0 · Março 2026

---

## Implementation Order (Dependency Graph)

```
EPIC 2 (Backend API)
  ├─ EPIC 1 (Camera Layer)    — depends on API ingest endpoints
  ├─ EPIC 3 (Check-in App)    — depends on API visitor/guide endpoints
  ├─ EPIC 4 (Dashboard)       — depends on API dashboard endpoints
  └─ EPIC 5 (Infrastructure)  — runs in parallel

EPIC 6 (Pilot Prep)
  └─ depends on EPIC 1 + 2 + 3 + 4 + 5 all complete
```

---

## Hard Constraints (Zero Tolerance)

These requirements are non-negotiable. Code review required before pilot:

- **No facial recognition** (camera layer)
- **No image storage** after CV processing
- **CPF hashed with Argon2id** — plaintext never stored, never logged
- **LGPD consent checkbox unchecked by default** — required before any data collection
- **Dashboard shows aggregates only** — no PII rows ever returned
- **System must operate 30 days without on-site intervention**
- **No civil works or complex cabling** for installation

---

## Success = Pilot Passes These

1. Camera shows **2–3× more visitors** than sign-in book
2. System runs **30 days without intervention**
3. Check-in adhesion: **> 30%** of camera visitors
4. First access: **< 45 seconds**
5. Return visit: **< 15 seconds**
6. Camera accuracy: **< 10% error**
7. Uptime: **> 95%**
