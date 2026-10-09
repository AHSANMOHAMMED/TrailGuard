# TrailGuard — Offline-First Wildlife Conservation & Anti-Poaching Field System

> **SE3070 Assignment 02 — Software Engineering / Architecture & Design**  
> **Group:** CSSE_NU_WE_01 · **Park Region:** Yala National Park, Sri Lanka  
> **Live Web Application:** [https://trailguard-sable.vercel.app](https://trailguard-sable.vercel.app)  
> **GitHub Repository:** [https://github.com/AHSANMOHAMMED/TrailGuard](https://github.com/AHSANMOHAMMED/TrailGuard)

---

## 👥 Group Members & Registration Numbers

| Student Name | Student Reg. No. | Role & Module Responsibilities | Primary Use Case Ownership |
|---|---|---|---|
| **Ahsan Mohammed** | **IT22578010** | **Group Leader** · Core Sync Engine, Photo Upload & Cryptography, Multi-Actor Roles | **UC02** (Field Incident Reporting) & **UC03** (Risk Alert Dispatch) |
| **Shureka** | **IT22314502** | Patrol Subsystem, Geo-Tracking & Coverage Engine | **UC01** (Conduct Ranger Patrol) |
| **Kajana** | **IT22189032** | Conflict Reporting, SMS Gateway Integration & Damage Compensation Valuation | **UC04** (Human-Wildlife Conflict Management) |

---

## 📸 System Overview & UI Screenshots

TrailGuard is an offline-first mobile and desktop field management platform designed for rangers, liaison officers, park managers, researchers, and community members operating in dead zones throughout Yala National Park.

| Onboarding & PIN Sign-In | UC01 Ranger Patrol & Map | UC02 Incident Capture & Receipt |
|:---:|:---:|:---:|
| ![Login](/docs/screenshots/ui_onboarding_login_1791546776357.jpg) | ![Patrol](/docs/screenshots/ui_patrol_screen_1791546825205.jpg) | ![Incident](/docs/screenshots/ui_incident_screen_1791546852785.jpg) |
| **Secure PIN Login & RBAC** | **GPS Track & Waypoints** | **Camera Upload & SHA-256** |

| UC03 Wildlife Risk Alert | UC04 Conflict Operations | Executive Conservation Reports |
|:---:|:---:|:---:|
| ![Alert](/docs/screenshots/ui_alert_screen_1791546883936.jpg) | ![Conflict](/docs/screenshots/ui_conflict_screen_1791546913914.jpg) | ![Reports](/docs/screenshots/uc_reports.png) |
| **Collar Geofence Triage** | **Community & SMS Hotline** | **Verified Snapshot & Export** |

---

## 🔑 Evaluator Field Login Credentials

Sign in on the **Login** screen using **User ID + Field PIN** (credentials are on-device offline verified):

| User ID | Persona | Field PIN | Role Title | Authorized Workspace Areas |
|---|---|---|---|---|
| `admin` | Park Systems Admin | `9999` | Super Admin | Full Access + `/admin` Role Divide |
| `RN-402` | RN-402 Mercer | `4021` | Field Ranger | Patrol · Incidents · Alerts · Conflict · Radio |
| `liaison` | Liaison Fernando | `7312` | Community Liaison Officer | Alerts · Conflict · Radio |
| `manager` | Mgr. Perera | `8450` | Park Manager | Alerts (Assign Desk) · Conflict Ops · Reports · Radio |
| `researcher` | Dr. Jayawardena | `5260` | Researcher | Conservation Reports · Radio |
| `community` | K. Bandara | `1111` | Community Member | Conflict Reporting · Community Radio (CMN-3) |

---

## ⚡ Core Architecture & Assignment 02 Improvements

### 1. Photo Capture, Upload & SHA-256 Digest (`src/routes/incidents.tsx`)
- **Native Camera & File Input:** Integrates native file upload and camera capture (`<input type="file" accept="image/*" capture="environment">`) with real-time `FileReader` data URL preview.
- **Client-Side SHA-256 Hashing:** Automatically computes cryptographic SHA-256 digest (`crypto.subtle.digest`) on capture/upload for tamper-evident field evidence verification.
- **Partial-Upload Resiliency (`S3/R-05`):** If network drops mid-upload, the report text is acknowledged while the photo attachment retains its stable ID and continues retrying in the background.

### 2. Multi-Actor Communication & Shared Sync Engine (`src/lib/store.ts`)
- **Shared Neon Postgres & PGLite Database:** All 6 operational roles seamlessly communicate across desks (`/patrol`, `/incidents`, `/alerts`, `/conflict`, `/reports`). Actions taken by one role (e.g. community SMS report or ranger risk ack) immediately populate liaison and manager dashboards.
- **Offline-First Contract:** All writes land locally as `PENDING`. No item claims `Submitted` until the sync engine receives a server acknowledgement (`SYNCED`) with an idempotent UUID upsert.
- **Exponential Backoff (`UC01b / R-02a`):** Failed uploads enter an exponential backoff schedule capped at 30 minutes, visible in the retry queue panel with manual bypass options.

### 3. Comprehensive Master Critique Defect Resolution Matrix

| Defect ID | Original Assignment 01 Flaw | Assignment 02 Structural Solution |
|---|---|---|
| **R-01** | Missing explicit boundary/controller separation | Structured standard MVC/Layered architecture with framework-free domain logic in `src/lib/domain/`. |
| **R-02a** | No visible retry mechanism for offline queue | Created `UC01b` visible retry queue panel with backoff timer countdowns and per-record retry. |
| **R-03** | Lack of single-active-assignment rule on alerts | Enforced single active officer assignment in `assignAlert` (`R-04`), auto-closing prior active assignments. |
| **R-05** | Media loss when connection fails mid-upload | Added complete-receipt and partial-upload state machine preserving attachment UUIDs across retries. |
| **R-07** | Arbitrary patrol coverage percentages | Implemented exact mathematical formula: $\text{Coverage \%} = \min\left(100, \frac{\text{Recorded Track Length (km)}}{\text{Assigned Route Length (km)}} \times 100\right)$. |
| **R-09** | Lack of connectivity status indicators | Added top-bar Connectivity Toggle and mode chips (`ONLINE` vs `OFFLINE - QUEUED LOCALLY`). |
| **R-10** | Tiny touch targets for field rangers | Re-engineered buttons with $\ge 50\text{px}$ touch targets and added instant Undo toast for mistaken waypoints. |

---

## 📐 UML Diagrams & Design Models

### 1. System Use Case Diagram
Includes all 6 primary actors, secondary camera trap/collar sensors, and communication gateways.

![Use Case Diagram](/docs/report_assets/fig1_updated_usecase.png)

---

### 2. Domain Class Diagram
Comprehensive class model showing domain entities (`Patrol`, `IncidentReport`, `RiskAlert`, `ConflictTicket`), value objects (`GeoLocation`, `Sha256Digest`), interfaces (`ConservationAPI`, `GeoService`), and state machines.

![Class Diagram](/docs/report_assets/fig2_updated_class.png)

---

### 3. Sequence Diagrams (UC01 – UC04)

<details>
<summary><b>Click to expand Sequence Diagrams</b></summary>

#### UC01 Conduct Ranger Patrol
![UC01 Sequence](/docs/report_assets/fig3_seq_uc01.png)

#### UC02 Report Field Incident
![UC02 Sequence](/docs/report_assets/fig4_seq_uc02.png)

#### UC03 Monitor Tracked Wildlife & Risk Alerts
![UC03 Sequence](/docs/report_assets/fig5_seq_uc03.png)

#### UC04 Manage Human-Wildlife Conflict
![UC04 Sequence](/docs/report_assets/fig6_seq_uc04.png)

</details>

---

## 🧪 Test Suite & Verification Results

### 1. Backend Test Suite (FastAPI / Pytest)
- **Location:** `artifacts/TrailGuard/backend/tests/`
- **Total Tests:** **33 Passed** (0 Failures, 0 Errors)
- **Core Engine Coverage:** **94.0%**
- **Run Command:**
  ```bash
  cd artifacts/TrailGuard/backend
  .venv/bin/pytest -v
  ```

### 2. Frontend Build & Static Analysis
- **TypeScript Compiler (`tsc --noEmit`):** Clean (0 type errors).
- **Vite Production Build:** Clean build generated for Vercel deployment.
- **Playwright Browser Smoke Verification:** Both Desktop (1280x800) and Mobile (390x844) viewports render with 0 console/page errors.

---

## 🚀 Running the Project Locally

### Prerequisites
- Node.js v20 or higher
- Python 3.11+ (for backend unit tests)

### 1. Web Application (Root)
```bash
# Install dependencies
npm install

# Start development server (serves on 0.0.0.0:8080)
npm run dev
```

### 2. Verification Commands
```bash
# Typecheck TypeScript files
npm run typecheck

# Run domain unit tests
npm run test:domain

# Build production bundle
npm run build
```

---

## 📄 Project Documentation & Artifacts

- **Compiled PDF Report:** [docs/SE3070_Assignment02_Final_Report.pdf](docs/SE3070_Assignment02_Final_Report.pdf)
- **Markdown Report Source:** [docs/SE3070_Assignment02_Final_Report.md](docs/SE3070_Assignment02_Final_Report.md)
- **Backend Reference Implementation:** `artifacts/TrailGuard/backend/`
- **Mobile RN Reference:** `artifacts/TrailGuard/mobile/`

---
*© 2026 TrailGuard Team · Yala National Park Conservation Project · SE3070 Assignment 02*
