# TrailGuard

Offline-first wildlife conservation & anti-poaching field system — **Yala National Park**.

> **SE3070 Assignment 02** · Group CSSE_2025_Y3_NU_WE2
> Critique & justified improvements of the A01 design, with implementations of all four
> use cases (UC01 Patrol · UC02 Incidents · UC03 Conflict · UC04 Reports) in two targets:
> this **web app** (TanStack Start) and the reference **FastAPI backend**.

---

## Live web app (this repository's root)

The UI implements the **A01 high-fidelity wireframes exactly**
(`attachments/CSSE_Group_1_NU_WE_v2.pdf`, Figures 6/10/14/18): a mobile field
app (390 px phone frame) with the wireframes' design system — primary
`#1F5A43`, secondary `#3B7A57`, background `#F6F8F5`, success `#2E7D50`,
offline amber `#D97706`, high-risk red reserved for alert states; 50–52 px
buttons; every state has a text label + icon.

Screens, flows and routes:

- `/patrol` — **UC01** Conduct Assigned Ranger Patrol (assigned → GPS tracking →
  manual waypoint A1 → offline A2 → sync restore A3 → complete → coverage summary)
- `/incidents` — **UC02** Report Field Incident (type → photo → GPS details →
  review → validating submit → offline conditional → submitted)
- `/alerts` — **UC03** Monitor Tracked Wildlife & Risk Alerts (incoming HIGH RISK →
  acknowledge → respond → coordination → resolve → resolved)
- `/conflict` — **UC04** Manage Human-Wildlife Conflict Reports (channel →
  details → review → offline conditional → submitted → staff review → responded)
- `/radio` — **Field Radio** push-to-talk over the park VHF channel plan (hold to
  talk → voice note or text callout → channel log; queued transmissions forward
  when coverage returns)

The header wifi pill simulates connectivity so the offline alternative flows
can be demonstrated. Underneath, the same offline-first domain rules apply
(see `artifacts/a02/REPORT.md` — the R-xx numbers referenced in code map to
that report):

- **Offline-first contract** — every write lands on-device (`PENDING`), nothing shows
  "Submitted" until sync ack; idempotent upserts by stable UUID.
- **Sync engine** (`src/lib/domain/sync-service.ts`) — per-record progress, complete-receipt
  for media, **partial-upload branch** (report acked, photo keeps retrying with the same ID),
  exponential backoff capped at 30 min.
- **Conflict desk** — single-active-assignment rule, notification-failure ladder with
  availability restore, escalation, close-with-outcome.
- **Reports** — snapshot over SYNCED records only, defined coverage formula
  (covered track km ÷ assigned route km), 92-day window cap, CSV export of the same
  snapshot id.
- **Role-based sign-in** — five actors (Ranger, Community Liaison Officer, Park
  Manager, Researcher, Community Member) sign in with a private 4-digit field
  PIN (`src/lib/auth-store.ts`); five wrong attempts lock sign-in for 60 s and
  the PINs are never printed in the UI. Sign-in is on-device and instant,
  matching the offline-first contract. Every route is wrapped in a `Guard`
  (`src/components/auth-gate.tsx`): actors only reach the use cases they are
  associated with on the A01 use case diagram; others see an explanatory
  access-restricted screen. The permission matrix (`src/lib/domain/roles.ts`)
  gates actions inside the ops desk from the signed-in session.

#### Evaluator PINs

PINs are credentials, so they live here (and in the viva notes), not on screen:

| Actor | Persona | PIN | Access |
|---|---|---|---|
| Ranger | RN-402 Mercer | `4021` | Patrol · Incidents · Alerts · Conflict · Radio |
| Community Liaison Officer | Liaison Fernando | `7312` | Alerts · Conflict · Radio |
| Park Manager | Mgr. Perera | `8450` | Alerts · Reports · Radio |
| Researcher | Dr. Jayawardena | `5260` | Reports |
| Community Member | K. Bandara, Nagoda | `1111` | Conflict |

#### Field Radio

Push-to-talk voice and text over three channels — Operations `140.2000 MHz`,
Emergency `141.3000 MHz`, Community `142.8000 MHz`. Hold the talk key to
record (device microphone via MediaRecorder), release to transmit; clips
play back from the channel log. Transmissions follow the same offline-first
contract as every other record: acked `SYNCED` under coverage, queued
`PENDING` in a dead zone, auto-forwarded on the next synchronisation.

### Run it

```sh
npm install          # Node 20+
npm run dev          # serves on 0.0.0.0:8080 (fixed by vite.config.ts)
```

No `.env` needed: with `DATABASE_URL` unset the app uses embedded PGLite
(`src/lib/db.ts`), so the preview and local dev work with zero configuration.

### Test it

```sh
npm run test:domain             # 74 unit tests over the domain layer
npm run test:domain:coverage    # + coverage (95%+ lines on src/lib/domain)
npm run typecheck               # tsc --noEmit
npm run build                   # production build (Vercel preset via Nitro)
```

### Layout

```
src/lib/domain/     Domain layer (framework-free): enums, model, transitions,
                    idempotency, reporting, sync-service, ports, roles
src/lib/store.ts    Zustand field-store adapter (persists to the device)
src/routes/         / (field desk) · /patrol · /incidents · /alerts · /conflict ·
                    /radio · /reports
artifacts/a02/      A02 group deliverables (report, diagrams, scenarios, tests plan)
```

Domain rules live in pure, unit-tested functions; React routes stay thin. Services are
the only writers of sync/delivery state; entities transition via `transitions.ts`.

---

## Reference backend (artifacts/TrailGuard/backend)

FastAPI + SQLAlchemy implementation of the same improved services — the A01 stack kept,
with A02 rules applied.

```sh
cd artifacts/TrailGuard/backend
python3.11 -m venv .venv && ./.venv/bin/pip install -r requirements.txt pytest pytest-cov
./.venv/bin/python -m pytest tests -q --cov=app/services   # 29 tests, ~97% service coverage
uvicorn app.main:app --reload --port 8000                  # API docs at /docs
```

## Reference mobile app (artifacts/TrailGuard/mobile)

Expo React Native screens from the A01 deliverable (kept for the design record).

---

## A02 deliverables map

| Deliverable | Where |
|---|---|
| Group critique report | `artifacts/a02/REPORT.md` |
| Improved UML (use case ×2, class, sequence ×4) | `artifacts/a02/diagrams/*.puml` (+ rendered `.png`/`.svg`) |
| Improved use case scenarios | `artifacts/a02/SCENARIOS.md` |
| Test plan & coverage map | `artifacts/a02/TESTING.md` |
| Web implementation | `src/` (this app) |
| Backend implementation + tests | `artifacts/TrailGuard/backend/` |
| A01 originals (design record) | `artifacts/diagram_sources/`, `artifacts/TrailGuard/docs/` |
