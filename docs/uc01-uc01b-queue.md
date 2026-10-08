# UC01b Retry Queue

- PENDING records are always retry-due
- FAILED records wait until `retryAfter` (backoff capped 30 min)
- Manual **Retry** bypasses the schedule (`retryRecord`)
- Per-record isolation: one failure does not block other queue items
