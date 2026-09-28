# TrailGuard — reference implementation (A01 stack, A02 rules)

Offline-first wildlife conservation & anti-poaching field system.

This folder is the **reference implementation**: the A01 stack (FastAPI + Expo) with the
A02 improved-design rules applied to the backend services. The live web implementation
lives in the repository root (`src/`). Design rationale: `../a02/REPORT.md`.

## Quick start

### Backend
```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt pytest pytest-cov
uvicorn app.main:app --reload --port 8000
```
API docs: http://127.0.0.1:8000/docs

### Backend tests (A02)
```bash
cd backend
./.venv/bin/python -m pytest tests -q --cov=app/services
```
29 unit tests covering all four services — ~97% service coverage. Key A02 rules under
test: idempotent upserts with waypoint/attachment dedup, flush-on-complete patrols,
single-active-assignment, notification-failure ladder with escalation, low-confidence
triage, complete-receipt incidents, window-capped snapshots with the defined coverage
formula.

### A02 changes in the backend
- `app/models/domain.py` — the enums/value objects A01 referenced but never declared
  (R-03), backoff schedule, CompleteReceipt.
- `app/services/patrol_service.py` — never a second active patrol (4a), flush the
  in-flight waypoint tail on finish (S1/R-05), waypoint-dedup upsert.
- `app/services/conflict_service.py` — one active assignment per alert (R-04),
  notification-failure ladder → escalation (S4/R-06, R-02b), close-with-outcome (R-02c),
  low-confidence triage (R-08), animal+zone alert dedup.
- `app/services/incident_service.py` — complete-receipt reflects stored media (S3/R-05).
- `app/services/report_service.py` — 92-day window cap, stable snapshot ids, defined
  coverage formula (T2/R-07).
- `app/models/entities.py` — `Alert.animal`, `ResponseAssignment.outcome`,
  `ResponseAssignment.notify_attempts` (justified in comments).

### Mobile (Expo — A01 design record)
```bash
cd mobile
npm install
npx expo start
```

## Modules
- UC01 Patrol · UC02 Incidents · UC03 Conflict · UC04 Reports
