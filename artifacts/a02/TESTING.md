# TrailGuard A02 — Test Plan & Coverage Map

Expectation: ≥80% of functionality per use case, positive/negative/edge/error cases,
meaningful assertions. This plan maps each improved-design rule (report §6) to tests in
both implementations. Run:

- **Web domain:** `npm run test:domain` (node:test + TypeScript strip-types)
- **Backend services:** `cd artifacts/TrailGuard/backend && pytest -q --cov=app`

---

## Cross-cutting (offline-first contract)

| Rule | Test cases | Type |
|---|---|---|
| Idempotent upsert by UUID | same patrolId twice → 1 record, no dup waypoints; same reportId twice → 1 record; unknown id → created; re-upsert preserves synced fields | positive / negative / edge |
| Sync state machine | PENDING→SYNCED on ack; FAILED carries retryAfter; backoff doubles per attempt; backoff capped at 30 min; retry-due only after retryAfter elapses | positive / edge |
| Sync engine branches (R-05) | full ack marks SYNCED; failure marks FAILED + schedules backoff; offline → no-op visible; per-record isolation (one failing record doesn't block others) | positive / negative / error |
| Partial upload (S3/R-05) | report acked + attachment failed → report SYNCED, attachment PENDING with same attachId; resume sends only un-acked parts | edge |
| Empty pending queue | synchronize() returns zeros without calling transport | edge |

## UC01 Patrol

| Rule | Test cases | Type |
|---|---|---|
| Start patrol | creates ACTIVE PENDING; **no second active patrol** (4a) | positive / negative |
| Waypoints | GPS + MANUAL sources recorded; in-flight flush on complete (S1); undo removes last waypoint; track length formula | positive / edge |
| Complete | COMPLETED + PENDING; flush appends tail waypoint before completion; completing twice rejected | positive / error |
| Coverage formula (R-07) | covered/route ratio; capped at 100; zero patrols → 0% (empty window zero-state); route-less patrol excluded from denominator | positive / edge |

## UC02 Incidents

| Rule | Test cases | Type |
|---|---|---|
| Validation | empty description rejected (4a); category must be valid enum; obs time required | negative |
| Draft→review→commit | draft retained until confirm; review does not persist | positive |
| Complete receipt | full ack flips report+attachments; **partial ack flips report only**; retry after partial sends only PENDING attachments | positive / edge |
| Camera-trap creation (R-02/F4) | creates incident with image geo/time; enters normal sync queue | positive |

## UC03 Conflict

| Rule | Test cases | Type |
|---|---|---|
| Ingest & assess | fresh+in-zone → OPEN alert; stale → historical only; out-of-zone → historical only; **same animal+zone refreshes existing alert, not duplicate** | positive / negative |
| Low-confidence triage (R-08) | LOW → review queue, no paging | edge |
| Assign (R-04) | unavailable officer rejected; **prior active assignment closed on reassign**; only one active per alert; officer marked busy | positive / negative |
| Notify failure (R-06) | FAILED → assignment FAILED, **officer availability restored**, alert back to OPEN; 2nd failure → ESCALATED + backup notified | positive / error |
| Acknowledge | ack stamps time; ack by non-assignee rejected; late double-ack is audit-only | positive / error |
| Close with outcome (R-02c) | CLOSED + outcome stored | positive |

## UC04 Reports

| Rule | Test cases | Type |
|---|---|---|
| Criteria validation | window > 92 days rejected; from > to rejected; invalid dates rejected | negative |
| Snapshot | SYNCED-only filter (PENDING excluded); cutoff recorded; same reportId for same window; by-category counts correct | positive / edge |
| Empty window | zero-state with cutoff present (S5/R-07) | edge |
| Export | CSV regenerates from stored snapshot, same reportId | positive |

---

## Coverage tooling

- **Web:** `node --test --experimental-test-coverage` over `src/lib/domain/*.ts` (target
  ≥80% lines on services + transitions + idempotency + reporting).
- **Backend:** `pytest-cov` with `--cov=app --cov-report=term-missing` (target ≥80% on
  `app/services/*`).
