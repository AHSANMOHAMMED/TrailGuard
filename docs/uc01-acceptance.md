# UC01 Acceptance Checklist (Sureka)

- [ ] Active patrol never enters the upload queue until COMPLETED
- [ ] Manual waypoint undo removes exactly one pointId (no orphans)
- [ ] Offline finish leaves PENDING; online Sync upserts same patrolId
- [ ] Second Sync does not grow the server-mirror patrol count
- [ ] Coverage uses track km ÷ route km (R-07), capped at 100
