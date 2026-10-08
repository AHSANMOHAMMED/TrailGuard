# UC01 No-Duplicate Sync

Create once with a stable `patrolId` → offline/online/fail/retry keep that id →
Sync upserts by id → SYNCED only after ack → Sync again leaves mirror count = 1.
