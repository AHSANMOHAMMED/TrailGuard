const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const diagrams = [
  {
    filename: 'trailguard_uc_diagram.png',
    code: `graph TD
    classDef actorStyle fill:#1F5A43,color:#FFF,stroke:#0A100C,stroke-width:2px;
    classDef ucStyle fill:#F0F5F2,color:#1F5A43,stroke:#3B7A57,stroke-width:1.5px;
    classDef sysStyle fill:#2A4365,color:#FFF,stroke:#1A202C,stroke-width:2px;

    Ranger["Field Ranger (Shureka / Ahsan)"]:::actorStyle
    Manager["Park Manager (Ahsan)"]:::actorStyle
    Liaison["Liaison Officer (Kajana)"]:::actorStyle
    Farmer["Community Member"]:::actorStyle
    
    IoT["<<System>> IoT Collar Gateway"]:::sysStyle
    SMS["<<System>> SMS Gateway"]:::sysStyle
    Backend["<<System>> DWC Central Server"]:::sysStyle

    subgraph TrailGuard System Boundary
        UC01["UC01: Conduct Assigned Ranger Patrol"]:::ucStyle
        UC01_Sync["Synchronize Patrol Route"]:::ucStyle
        UC01_Buffer["Buffer Offline Patrol Data"]:::ucStyle
        UC01_Gauge["Calculate 96% Route Coverage"]:::ucStyle

        UC02["UC02: Report Field Incident"]:::ucStyle
        UC02_Photo["Attach Geotagged Photo"]:::ucStyle
        UC02_Receipt["Verify Complete-Receipt (SHA-256)"]:::ucStyle
        UC02_Queue["Queue Offline SQLite Packet"]:::ucStyle

        UC03["UC03: Monitor Wildlife & Risk Alerts"]:::ucStyle
        UC03_Ingest["Ingest Collar Telemetry"]:::ucStyle
        UC03_Geofence["Evaluate Farmland Geofences"]:::ucStyle
        UC03_Page["Page Emergency Intervention Unit"]:::ucStyle

        UC04["UC04: Manage Human-Wildlife Conflict"]:::ucStyle
        UC04_SMS["Ingest via Rural SMS Gateway"]:::ucStyle
        UC04_Dispatch["Audit Damage & Dispatch Team"]:::ucStyle
    end

    Ranger --> UC01
    UC01 ..->|<<include>>| UC01_Sync
    UC01 ..->|<<extend>>| UC01_Buffer
    UC01 ..->|<<include>>| UC01_Gauge

    Ranger --> UC02
    UC02 ..->|<<extend>>| UC02_Photo
    UC02 ..->|<<include>>| UC02_Receipt
    UC02 ..->|<<extend>>| UC02_Queue

    IoT --> UC03_Ingest
    UC03_Ingest ..->|<<include>>| UC03
    UC03 ..->|<<include>>| UC03_Geofence
    UC03 ..->|<<extend>>| UC03_Page
    Manager --> UC03
    UC03_Page --> Ranger

    Farmer --> UC04
    SMS --> UC04_SMS
    UC04_SMS ..->|<<extend>>| UC04
    Liaison --> UC04
    UC04 ..->|<<include>>| UC04_Dispatch

    UC01_Sync --> Backend
    UC02_Receipt --> Backend
    UC04_Dispatch --> Backend`
  },
  {
    filename: 'trailguard_class_diagram.png',
    code: `classDiagram
    class SyncState {
        <<enumeration>>
        PENDING
        IN_FLIGHT
        SYNCED
        FAILED
    }

    class DomainEntity {
        <<abstract>>
        +UUID id
        +DateTime createdAt
        +DateTime updatedAt
        +SyncState syncState
    }

    class Patrol {
        +String beatRouteId
        +String rangerId
        +PatrolStatus status
        +Float distanceKm
        +Float coveragePct
        +startPatrol()
        +completePatrol()
        +flushTailCoordinates()
    }

    class Waypoint {
        +UUID patrolId
        +Float latitude
        +Float longitude
        +Float altitude
        +String source
        +DateTime timestamp
    }

    class IncidentReport {
        +String category
        +String severity
        +Float latitude
        +Float longitude
        +String landmark
        +String reporterId
        +Boolean completeReceipt
    }

    class PhotoAttachment {
        +UUID incidentId
        +String localUri
        +String remoteUrl
        +String sha256Digest
        +Boolean isUploaded
    }

    class WildlifeAlert {
        +String animalId
        +String zoneId
        +Float confidencePct
        +String triageLevel
        +String status
        +DateTime acknowledgedAt
        +DateTime resolvedAt
    }

    class ResponseAssignment {
        +UUID alertId
        +String teamUnit
        +String leadOfficerId
        +String status
        +DateTime assignedAt
    }

    class ConflictReport {
        +String ticketId
        +String channel
        +String villageSector
        +Integer herdSize
        +String damageCategory
        +String complainantPhone
        +Float valuationAmount
    }

    DomainEntity <|-- Patrol
    DomainEntity <|-- Waypoint
    DomainEntity <|-- IncidentReport
    DomainEntity <|-- PhotoAttachment
    DomainEntity <|-- WildlifeAlert
    DomainEntity <|-- ResponseAssignment
    DomainEntity <|-- ConflictReport

    Patrol "1" *-- "0..*" Waypoint : contains
    IncidentReport "1" *-- "0..*" PhotoAttachment : attaches
    WildlifeAlert "1" o-- "0..*" ResponseAssignment : dispatches`
  },
  {
    filename: 'trailguard_seq_uc01.png',
    code: `sequenceDiagram
    autonumber
    actor Shureka as Field Ranger (Shureka)
    participant UI as PatrolScreen (UI)
    participant DB as LocalStore (SQLite)
    participant Sync as SyncService (Background)
    participant Server as DWC Central Server

    Shureka->>UI: Select Route NB-03 & Tap "Start Patrol"
    UI->>DB: insertPatrol(routeId, ACTIVE, PENDING)
    DB-->>UI: Return Patrol ID (PAT-2026-001)
    UI-->>Shureka: Render Active Patrol Dashboard & Map Track
    
    loop Every 30 Seconds (GPS Polling)
        UI->>DB: appendWaypoint(lat, lon, alt, GPS)
    end

    Shureka->>UI: Tap "Mark Manual Waypoint" (WP-03 Outpost)
    UI->>DB: appendWaypoint(lat, lon, MANUAL)

    Shureka->>UI: Tap "End Patrol"
    UI-->>Shureka: Display Confirmation Modal (Stats & Coverage)
    Shureka->>UI: Confirm End Patrol
    UI->>DB: flushTailPoints()
    UI->>DB: updatePatrol(COMPLETED, coverage: 96%)
    UI-->>Shureka: Render Final Patrol Summary (96% Coverage Gauge)

    Note over DB,Sync: Cellular Network Restored
    Sync->>DB: getPendingPatrols()
    DB-->>Sync: Return PAT-2026-001 Payload
    Sync->>Server: POST /api/v1/patrols/sync
    Server-->>Sync: HTTP 200 OK (Sync Receipt)
    Sync->>DB: updateSyncState(PAT-2026-001, SYNCED)`
  },
  {
    filename: 'trailguard_seq_uc02.png',
    code: `sequenceDiagram
    autonumber
    actor Ahsan as Field Ranger (Ahsan)
    participant UI as IncidentScreen (UI)
    participant Cam as CameraEngine
    participant DB as LocalStore (SQLite)
    participant Sync as CompleteReceiptSync
    participant Server as DWC Server / S3

    Ahsan->>UI: Tap "+ New Incident" & Select "Wire Snare"
    UI->>Cam: Capture Photo Evidence
    Cam-->>UI: Return Image URI & GPS Coordinates
    UI->>UI: Calculate SHA-256 Image Digest
    Ahsan->>UI: Set Severity "HIGH" & Tap "Submit Report"

    UI->>DB: saveIncident(PENDING, complete: false)
    DB-->>UI: Return Local UUID (INC-OFFLINE-UUID)
    UI-->>Ahsan: Render "Report Saved Offline — Syncing Media"

    Sync->>DB: getPendingIncidents()
    DB-->>Sync: Return Text Report & Photo Stream
    Sync->>Server: POST /api/v1/incidents/upload-complete
    Server->>Server: Verify SHA-256 Digest & Store in PostgreSQL/S3
    Server-->>Sync: HTTP 200 OK (Receipt ID: INC-2026-0812, complete: true)
    Sync->>DB: updateIncident(SYNCED, complete: true, ref: INC-2026-0812)
    Sync-->>UI: Complete-Receipt Event Triggered
    UI-->>Ahsan: Render Green SYNCED Receipt (INC-2026-0812)`
  },
  {
    filename: 'trailguard_seq_uc03.png',
    code: `sequenceDiagram
    autonumber
    participant Collar as IoT Elephant Collar (EL-04)
    participant Gate as IoT Gateway & GeofenceEvaluator
    participant Alert as AlertService
    actor Ahsan as Manager / Ranger (Ahsan)
    participant UI as TacticalMap UI

    Collar->>Gate: Transmit Satellite GPS Fix (Speed: 4.8 km/h)
    Gate->>Gate: Evaluate Farmland Geofence Buffer Zone
    Gate->>Alert: Geofence Breach Triggered (Confidence: 94%)
    Alert->>Alert: Create Emergency Alert AL-2026-09 (Triage: PAGE)
    Alert->>Ahsan: Send High-Priority Emergency Pager Alert

    Ahsan->>UI: Open Alert Dossier & Tap "Acknowledge Dispatch"
    UI->>Alert: updateAlertStatus(IN_PROGRESS, officer: Ahsan)
    UI-->>Ahsan: Render Tactical Map (Elephant Track, Breadcrumbs, ETA: 8m)

    Note over Ahsan,UI: Ranger Deploys Acoustic Thumper Deterrent
    Ahsan->>UI: Open Resolution Modal & Select Deterrent Action
    UI->>Alert: closeAlert(RESOLVED, action: Acoustic Thumper)
    Alert-->>UI: Return Resolution Confirmation
    UI-->>Ahsan: Update Dashboard & Regional Risk Heatmap`
  },
  {
    filename: 'trailguard_seq_uc04.png',
    code: `sequenceDiagram
    autonumber
    actor Farmer as Community Member / Farmer
    participant SMS as Rural SMS Gateway
    participant Intake as Conflict IntakeService
    actor Kajana as Liaison Officer (Kajana)
    participant Field as Response Unit (Team Echo 3)

    Farmer->>SMS: Send SMS "HEC Sector 3 4 Elephants +94771234567"
    SMS->>Intake: Forward Parsed SMS Ingestion Packet
    Intake->>Intake: Create Ticket HWC-2026-042 (Status: OPEN)
    Intake-->>SMS: Trigger Automated SMS Receipt
    SMS-->>Farmer: Send SMS "Ticket HWC-2026-042 Registered. DWC Dispatched."

    Kajana->>Intake: Open Conflict Review Workspace
    Intake-->>Kajana: Render Pending Ticket HWC-2026-042
    Kajana->>Intake: Set Priority "URGENT" & Assign Team Echo 3
    Intake->>Field: Dispatch Notification to Team Echo 3

    Note over Field: Field Team Secures Corridor & Assesses Crop Damage
    Field->>Intake: Log Damage Assessment & Valuation (LKR 150,000)
    Kajana->>Intake: Approve Relief Valuation & Tap "Close Case"
    Intake-->>Kajana: Ticket HWC-2026-042 Marked CLOSED`
  }
];

async function renderDiagrams() {
  const assetsDir = path.join(__dirname, '../docs/report_assets');
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  console.log('Launching browser to render Mermaid diagrams...');
  const browser = await chromium.launch({ headless: true });

  for (const item of diagrams) {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
  <style>
    body { background-color: #ffffff; padding: 20px; margin: 0; font-family: sans-serif; display: inline-block; }
    .mermaid { background: #ffffff; }
  </style>
</head>
<body>
  <div class="mermaid">
    ${item.code}
  </div>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'neutral' });
  </script>
</body>
</html>`;

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    const element = await page.$('.mermaid');
    const outPath = path.join(assetsDir, item.filename);
    if (element) {
      await element.screenshot({ path: outPath, omitBackground: false });
      console.log('Saved diagram:', outPath);
    } else {
      console.error('Failed to find mermaid element for:', item.filename);
    }
    await page.close();
  }

  await browser.close();
  console.log('All TrailGuard diagrams rendered successfully!');
}

renderDiagrams().catch(err => {
  console.error('Diagram rendering failed:', err);
  process.exit(1);
});
