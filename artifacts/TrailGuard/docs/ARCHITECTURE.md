# TrailGuard — Architecture Plan
**Smart Wildlife Conservation & Anti-Poaching Monitoring System**
Group: Y3S2-NU-WE-02 | SE3070 Assignment 01

## 1. Product name
**TrailGuard**  
Tagline: *Offline-first field records you can trust.*

Package IDs:
- Android / iOS app: `com.trailguard.field`
- Backend API: `api.trailguard.local`
- DB schema: `trailguard`

## 2. Goals (mapped to use cases)
| UC | Goal |
|----|------|
| UC01 | Manage patrol operations (start/finish, waypoints, offline sync) |
| UC02 | Record wildlife incidents offline with complete-receipt sync |
| UC03 | Coordinate conflict response (collar → alert → assign → ack) |
| UC04 | Analyze conservation data and export snapshot reports |

## 3. Style: Offline-first
1. Every field write goes to **LocalStore** first (SQLite).
2. Status = `PENDING` until server returns acknowledgement.
3. Sync uses **stable UUIDs + upsert** (no duplicate patrols/incidents).
4. Media (photos) requires **complete-receipt** before marking synced.
5. UI never claims “Submitted” before Ack.

## 4. Logical layers
```
┌─────────────────────────────────────────────┐
│  Presentation  (React Native / screens)     │
├─────────────────────────────────────────────┤
│  Application services                       │
│  PatrolService · IncidentService            │
│  ConflictService · ReportService · SyncService │
├─────────────────────────────────────────────┤
│  LocalStore (SQLite)  │  API client (HTTPS) │
├─────────────────────────────────────────────┤
│  Domain models (shared types)               │
├─────────────────────────────────────────────┤
│  Backend: FastAPI + PostgreSQL              │
│  ConservationAPI · NotificationGateway      │
└─────────────────────────────────────────────┘
```

## 5. Domain model (inheritance)
- Person ← Officer, ParkManager, Researcher
- FieldRecord ← Patrol, IncidentReport, CommunityReport
- SensorSource ← GPSCollar, CameraTrap
- Composition: Patrol→Waypoint, IncidentReport→PhotoAttachment
- Park aggregates routes, officers, zones, incidents

## 6. Backend modules
| Module | Responsibility |
|--------|----------------|
| auth | JWT for ranger / manager / researcher |
| patrols | upsert patrol + waypoints |
| incidents | upsert incident + attachments (complete-receipt) |
| conflict | ingest reading, alerts, assignments, ack |
| reports | snapshot query + PDF/CSV export |
| sync | batch pending upsert endpoint |

## 7. Mobile modules
| Module | Responsibility |
|--------|----------------|
| screens/patrol | route list, active track, finish |
| screens/incident | form, photo, pending list |
| screens/conflict | alerts, assign (manager) |
| screens/reports | filters, results, export |
| services/* | domain operations |
| store/local | SQLite via expo-sqlite / sqlite |
| services/sync | background + manual sync |

## 8. Data flow examples
**Patrol offline**
Ranger → PatrolApp → PatrolService → LocalStore(PENDING)
…later online…
SyncService → ConservationAPI.upsert → Ack → markSynced

**Conflict online**
SensorGateway → ConflictService.ingest → assessRisk → Alert
Manager → assign → NotificationGateway → Officer ack

**Report**
Manager → ReportService.generate → API.query(snapshot) → aggregate → export same snapshotId

## 9. Tech stack
| Layer | Choice |
|-------|--------|
| Mobile | React Native (Expo) + TypeScript |
| Local DB | expo-sqlite |
| Backend | FastAPI (Python 3.11+) |
| Server DB | PostgreSQL 15 |
| Auth | JWT (python-jose) |
| Files | local device + server object storage path |
| Diagrams | PlantUML (already delivered) |

## 10. Non-functional
- Idempotent upsert by UUID
- Explicit PENDING vs SYNCED
- Delivery state ≠ acknowledgement
- Pending field rows excluded from reports
- Encrypted local DB at rest (SQLCipher optional)

## 11. Repo layout
```
TrailGuard/
  docs/ARCHITECTURE.md
  shared/types.ts
  backend/          FastAPI app
  mobile/           Expo React Native app
  README.md
```
