# Pulso Cultural MVP 1.0 - Implementation Tasks

## [EPIC 2] Backend API (Core Dependency)
- [ ] Implement Argon2id hashing for CPF [HARD CONSTRAINT]
- [ ] Add ingest endpoints for camera data
- [ ] Implement aggregate-only dashboard analytics [HARD CONSTRAINT]
- [ ] Refactor existing Express controllers for LGPD alignment

## [EPIC 1] Camera Layer
- [ ] Integrate CV model (YOLOv8/MediaPipe) without image storage
- [ ] Implement "no facial recognition" guarantee [HARD CONSTRAINT]
- [ ] Local persistence buffer for offline operation (30 days)

## [EPIC 3] Check-in App
- [ ] [NEW] Share Card generation (html-to-image)
- [ ] [MODIFY] Guide screen lifecycle (exactly 6 artworks)
- [ ] Verify LGPD checkbox default is false [HARD CONSTRAINT]

## [EPIC 4] Dashboard
- [ ] Implement real-time occupancy updates
- [ ] Ensure no PII rows are visible [HARD CONSTRAINT]

## [EPIC 5] Infrastructure
- [ ] Dockerize services for deployment
- [ ] Set up sync mechanism for camera-to-cloud resilience

## [EPIC 6] Pilot Prep
- [ ] 30-day resilience testing
- [ ] Camera accuracy validation (<10% error)
