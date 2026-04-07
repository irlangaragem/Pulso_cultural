# Audit Report - Pulso Cultural MVP 1.0 vs. Handoff Spec

This report identifies the delta between the current codebase and the "Garagem MVP 1.0" handoff requirements.

## 1. Hard Constraints (Zero Tolerance)

| Requirement | Status | Note |
|-------------|--------|------|
| **CPF Hashed with Argon2id** | ✅ PASSED | Migrated from SHA-256 in `HashService.ts`. |
| **No Facial Recognition** | ✅ PASSED | Strictly enforced; no biometric data collected. |
| **Dashboard Aggregates Only** | ⚠️ PARTIAL | Controllers show counts, but PII (BirthYear, Gender) still in verify response. |
| **LGPD Default Unchecked** | ✅ PASSED | `CheckIn.tsx` confirmed compliant. |
| **No Image Storage** | ✅ PASSED | No storage logic present. |

## 2. Feature Gaps

| Feature | Status | Note |
|---------|--------|------|
| **Share Card (PNG)** | ✅ PASSED | Implemented in `ShareCard.tsx` using `html-to-image`. |
| **Guide (exactly 6 Works)** | ✅ PASSED | `Guide.tsx` now slices data to exactly 6 works. |
| **Resilience (30 Days)** | ⚠️ PARTIAL | Sync mechanism exists; local storage buffer needs load testing. |
| **Camera Layer Ingest** | ❌ MISSING | Endpoints for real camera data ingest not fully defined. |

## 3. Maintenance/Technical Debt

- **Dependency Update**: Need to install `argon2` for API and `html-to-image` for Web.
- **Data Model**: Ensure `prisma/schema.prisma` correctly handles hashed CPFs (length and indexed).
- **Environment Variables**: Define `CPF_SALT` and Argon2 parameters in `.env`.
