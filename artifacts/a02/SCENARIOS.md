# TrailGuard — Improved Use Case Scenarios (A02)

Companion to `REPORT.md` §6 (R-05…R-08) and the improved diagrams in `diagrams/`.
Extension numbering is **anchored** (extension *N*x branches from step *N*). Each scenario
carries the offline-first contract: local-first writes, explicit PENDING → SYNCED,
idempotent upsert by stable UUID, complete-receipt for media, delivery ≠ acknowledgement.

---

## UC01-P01 — Record an assigned patrol (improved)

| Field | Value |
|---|---|
| Use case ID | UC01-P01 |
| Name | Record an assigned patrol |
| Summary | Authorized ranger opens an assigned route, starts a patrol, records GPS or manual waypoints (including offline), finishes the patrol with a flush of in-flight waypoints, and synchronizes a single trustworthy record — with automatic retry on failure. |
| Priority | 5 (highest) |
| Preconditions | 1) Ranger authorized. 2) Assigned route and offline map downloaded. 3) Device storage available. |
| Post condition | Completed patrol + waypoints saved locally as PENDING; server receives exactly one matching record after sync (idempotent by `patrolId`); failures re-queue with a retry schedule; UI never shows "Submitted" before ack. |
| Primary actor | Ranger |
| Secondary actors | Park Manager (route assignment), ConservationAPI |
| Trigger | Ranger opens assigned route, chooses Start patrol. |

**Main success scenario**

| Step | Action | System response |
|---|---|---|
| 1 | Ranger opens route RT-07 | App shows route, map availability, last sync, and a **mode chip** (ONLINE / OFFLINE — QUEUED LOCALLY) (R-09) |
| 2 | Ranger chooses Start patrol | PatrolService creates PT-104 ACTIVE; LocalStore saves PENDING; UI: "Patrol started — saved on this phone" |
| 3 | Device supplies a position | Timestamped waypoint recorded locally (source GPS); **one-tap large target + undo toast for manual marks** (R-10) |
| 4 | Ranger chooses Finish and confirms | **In-flight waypoint save is flushed first** (S1/R-05); status COMPLETED, PENDING; queued for sync |
| 5 | Connectivity returns at base | SyncService uploads pending; ConservationAPI upserts by stable ID; **per-record progress shown** ("Syncing 3 of 7…") (R-09) |
| 6 | Server acknowledges | LocalStore marks SYNCED; UI shows completion + last-sync; IDs demoted to secondary typography (H5/R-09) |

**Extensions (anchored)**

| Branch | Condition | Action / system response |
|---|---|---|
| 3a | GPS unavailable | Add waypoint on downloaded map; source=MANUAL; continue at 3. |
| 3b | Manual mark made in error | Undo toast (R-10): waypoint removed; no orphan records. |
| 4a | Cancel finish | Patrol remains ACTIVE; **no second patrol is created** (S1 — now modeled). |
| 5a | Already online at save | Synchronization runs immediately after local save. |
| 5b | Upload fails (timeout/rejected) | Record **FAILED with `retryAfter`**; SyncService schedules retry with **exponential backoff capped at 30 min** (S2/R-05); UI: "3 records held — retrying automatically". |
| 5c | Device offline at finish | Status PENDING; mode chip shows OFFLINE — QUEUED LOCALLY; sync deferred. |
| 2b | Storage failure | "Save failed — not persisted"; input kept; retry after freeing storage. |

**UC01b — Retry failed sync (new, R-02a; extends UC01 sync)**

Ranger opens the pending queue (badge shows count), reviews per-record failure reasons, taps
Retry on a record → SyncService attempts immediately, bypassing the backoff schedule. Queue
depth is visible at all times (T1/H4).

---

## UC02-P01 — Report a snare while offline (improved)

| Field | Value |
|---|---|
| Use case ID | UC02-P01 |
| Name | Report a snare while offline |
| Summary | Ranger captures a snare sighting as a **draft → review → confirm** flow, saves locally as PENDING; on reconnect, the report and photo sync under a **complete-receipt**, resuming partial uploads with the same IDs. |
| Priority | 5 |
| Preconditions | 1) Ranger authorized. 2) Cached incident categories. 3) Camera available (for photo). |
| Post condition | Incident + attachments saved locally; sync leaves no duplicate on retry; partial upload resumes without re-sending acked data; complete-receipt required before any media is marked SYNCED. |
| Primary actor | Ranger |
| Secondary actor | Camera Gateway (review flow), ConservationAPI |
| Trigger | Ranger discovers a snare during an offline patrol. |

**Main success scenario**

| Step | Action | System response |
|---|---|---|
| 1 | Ranger opens New incident | Form shows **grouped categories with icons** (Snares / Animal / Other) (R-10) |
| 2 | Selects Snare, adds photo, location, description | Draft retained; obs time shown; **mode chip** reflects connectivity (R-09) |
| 3 | Ranger taps **Review** | Summary screen: type, photo, location, obs time — **before** commit (R-10; the A01 hi-fi review screen moved before commit) |
| 4 | Ranger confirms | IncidentService validates; LocalStore saves IR-208 + photo as PENDING; UI: "Saved on this phone — will send when signal returns" (H5/R-09) |
| 5 | Connectivity returns | SyncService uploads report + attachments with per-record progress |
| 6 | Server acks complete receipt | Both marked SYNCED; UI: "Submitted IR-208" |

**Extensions (anchored)**

| Branch | Condition | Action / system response |
|---|---|---|
| 3a | Ranger edits at review | Return to form with draft intact; no partial save. |
| 4a | Validation fails (missing description) | "Description is required" — no local record; draft kept. |
| 5a | **Report acked, photo interrupted** | Report → SYNCED; attachment stays PENDING with **same attachId**; resume sends only the photo (S3/R-05) — no duplicate. |
| 5b | Upload interrupted entirely | Keep PENDING; `retryAfter` scheduled (backoff, capped 30 min); resume with same IDs. |
| 5c | Retry after partial upload | Only un-acked parts re-sent; complete-receipt still required to mark media SYNCED. |
| 6a | **Camera-trap review creates incident** | Manager/Camera Gateway reviews image → IncidentService creates incident (category, geo, timestamp from image); enters normal sync (R-02/F4, R-08). |
| 1a | Duplicated submission | Upsert is idempotent by `reportId` — resubmission updates, never duplicates (case-study complete-receipt semantics, now demonstrated). |

---

## UC03-P01 — Assign a response to a risk alert (improved)

| Field | Value |
|---|---|---|
| Use case ID | UC03-P01 |
| Name | Assign a response to a risk alert |
| Summary | Sensor ingest → risk assessment → alert (with **low-confidence triage**) → manager assignment (**single active assignment**) → notification with **failure branch and escalation ladder** → officer acknowledgement → **close with outcome**. |
| Priority | 5 |
| Preconditions | 1) Collar readings flowing. 2) Risk zones configured. 3) Officer roster available. |
| Post condition | Alert OPEN → ASSIGNED → (ack) → CLOSED with outcome; at most one active assignment; failed notifications restore availability and return the alert to OPEN, escalating after the ladder exhausts. |
| Primary actor | Park Manager |
| Secondary actors | Sensor Gateway, Ranger/Liaison, NotificationGateway |
| Trigger | Collar reading lands in a risk zone while fresh. |

**Main success scenario**

| Step | Action | System response |
|---|---|---|
| 1 | Sensor gateway delivers collar reading | ConflictService validates; assesses fresh AND in-zone |
| 2 | Fresh, in-zone, confidence HIGH/MEDIUM | OPEN alert created/updated (dedup: same animal+zone re-opens/refreshes rather than duplicating) |
| 3 | Manager opens alert | Details: animal, zone, obs/recv times, confidence |
| 4 | Manager selects available officer | `Officer.isAvailable()` validated; **any prior active assignment is closed** (R-04); RA-031 created |
| 5 | System notifies officer | DeliveryState recorded — **delivery ≠ acknowledgement**, both visible (H4) |
| 6 | Officer acknowledges | Timestamp recorded; status ACKNOWLEDGED |
| 7 | Liaison closes with outcome | Alert CLOSED; outcome note stored (R-02c) |

**Extensions (anchored)**

| Branch | Condition | Action / system response |
|---|---|---|
| 2a | **Confidence LOW** | Alert held in REVIEW queue; **no paging**; manager triages later (R-08) |
| 2b | Stale or out-of-zone reading | Stored historical only; no alert |
| 4a | No available officer | Alert stays OPEN; UI offers **Escalate** (R-02b) |
| 5a | **Notification FAILED** | Assignment delivery=FAILED; **officer availability restored** (`markFree()`); alert returns to OPEN; re-notify (2 attempts) (S4/R-06) |
| 5b | Re-notify fails twice | Alert **ESCALATED**; backup officer list notified (R-02b); audit trail kept |
| 5c | Officer acknowledges late, after escalation | First ack wins; later acks recorded as audit events, no state change |
| 4b | Manager reassigns | Prior active assignment closed; new RA created (R-04 — modeled, not accidental) |

---

## UC04-P01 — Generate a park conservation report (improved)

| Field | Value |
|---|---|
| Use case ID | UC04-P01 |
| Name | Generate a park conservation report |
| Summary | Manager/Researcher selects scope, validates window (≤ 92 days), generates a report over **SYNCED records only** with an explicit cutoff, **defined coverage formula**, zero-state for empty windows, and export reusing the same snapshot id. |
| Priority | 4 |
| Preconditions | 1) Authorized role. 2) Synced records exist (or empty state accepted). |
| Post condition | One immutable snapshot (reportId, cutoff) persisted; exports reproduce the same snapshot; pending records never included. |
| Primary actor | Park Manager; Researcher |
| Trigger | Manager needs evidence-based reporting for the window. |

**Main success scenario**

| Step | Action | System response |
|---|---|--- |
| 1 | User opens Reports | Permitted parks + filters shown |
| 2 | Chooses park, dates, categories | `ReportCriteria.validate()` checks window ≤ 92 days and from < to (S5/R-07) |
| 3 | Generate | Snapshot queried: **SYNCED only**, cutoff recorded |
| 4 | Aggregation | Counts, by-type, conflicts, and **coverage% = synced completed-patrol waypoint-distance ÷ assigned-route distance** (capped 100) (T2/R-07) |
| 5 | Display | Results + cutoff + limitations ("pending excluded: N") |
| 6 | Export PDF/CSV | **Same snapshotId + filters** reproduce the report (no re-query) |

**Extensions (anchored)**

| Branch | Condition | Action / system response |
|---|---|---|
| 2a | Window > 92 days or inverted | "Choose a window up to 92 days" — no query |
| 4a | **No synced records in window** | Zero-state report: counts 0, empty chart, cutoff still shown; "No synced records in this window" (S5 — now modeled) |
| 6a | Export before any sync | Same zero-state snapshot exported; never silently re-query |

---

## UC03b / UC03c (new, R-02b/c) — summaries

**UC03b — Escalate unassigned alert**: alert OPEN beyond a configurable time-box (default
30 min) with no assignment → ConflictService escalates: status ESCALATED, backup officer
list notified via NotificationGateway; delivery states tracked as in UC03; audit event
recorded. Manager may escalate manually at any time (extension 4a).

**UC03c — Close alert with outcome**: Liaison/Manager records the resolution (e.g.
"elephant driven back, no injuries") → alert CLOSED, outcome stored on the assignment and
alert, timestamps kept. Closes the conflict lifecycle the A01 design left open.
