# UC01 Offline Flow Notes

When the device is Offline at finish:

1. `finishPatrol` writes COMPLETED + PENDING locally.
2. `synchronize()` throws and leaves the same UUID.
3. Connectivity restore drains the UC01b queue via `syncOne` → mirror upsert → SYNCED.
