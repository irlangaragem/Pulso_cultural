# Product Intent Specification — Pulso Cultural

**Type**: Strategic → Operational  
**Source of Truth**: Intent (What, not How)  
**Authority**: Development Team (Technical Decision)

---

## 1. Central Cognitive Object
**Cada visitante = um pulso mensurável de impacto cultural.**

---

## 2. Problem Context [INTENT_LAYER]
Public cultural institutions depend on proving social impact to maintain funding.

### Operational Reality
Visitor control is currently manual (optional guestbooks).

### Knowledge Gaps (UNKNOWN STATE)
The current system fails to measure:
- Real number of visitors
- Recurrence/Retention
- Dwell time
- Demographic profiles
- Temporal peaks and valleys

### Systemic Consequence
Culture impact exists but isn't reliably measurable.
- Results in fragile reports, funding difficulties, and curatorial decisions made without data.

---

## 3. Product Vision [CONCEPT_LAYER]
Pulso Cultural is an **audience intelligence platform**.

### Core Concept
A visitor is not a number; they are a **pulse** that proves social relevance.

### Dual-Layer Architecture

#### Layer 1: Computer Vision [DATA_TRUTH_LAYER]
**Function**: Absolute data generation independent of human action.
- **Inputs/Outputs**: Flow, real-time occupancy, temporal peaks.
- **Constraints**: 
    - ❌ No facial recognition
    - ❌ No image storage
    - ✅ Total privacy
    - ✅ Accessible hardware

#### Layer 2: Check-in + Guide [ENGAGEMENT_LAYER]
**Value Exchange**: Voluntary data ↔ Immediate cultural experience.
- **Flow**: QR Code → CPF → First access (mini cadastro/LGPD) → Digital Guide.
- **Expected Outputs**: Aggregated demographics, recurrence, history, social media "mídia espontânea".
- **Identifier**: CPF (Encrypted, low friction, national unique key).

---

## 4. MVP Scope [SCOPE_LAYER]
**Hypothesis**: Manual guestbooks drastically underestimate actual attendance.

### Camera Layer
- In/Out counting
- Real-time occupancy
- Temporal flux

### Check-in Layer
- Responsive Web App
- Demographic registration
- Digital Guide
- Shareable "Pulse" Card

### Dashboard
- Unified panel
- Exportable reports

---

## 5. Visual & Interaction Identity [EXPERIENCE_LAYER]
**Product Cognitive Language**:
- **Avoid**: "cadastro", "login", "sistema"
- **Use**: **"pulso"**, **"pulsar"**, **"vivo"**, **"experiência"**

---

## 6. Success Metrics [VALIDATION_LAYER]
- **Primary**: Camera count ≥ 2–3× guestbook.
- **Secondary**:
    - Check-in adhesion: > 30%
    - First access: < 45s
    - Return access: < 15s
    - Camera accuracy: < 10% error
    - Uptime: > 95%

---

## 7. Trust & Compliance [TRUST_LAYER]
- **Anonymous Data (Camera)**: Count + Timestamps. Legal basis: Legitimate Interest.
- **Personal Data (Check-in)**: Encrypted CPF, demographics, history. Legal basis: Consent.
- **Obligations**: Purpose clarity, right to erasure, **Aggregated dashboard only** (No PII rows).

---

## 8. Pilot Environment [ENVIRONMENT_LAYER]
**Location**: MAM Bahia — Museu de Arte Moderna.
- Hybrid indoor/outdoor, variable lighting.
- Requirement: System adapts to the space, not vice-versa.
