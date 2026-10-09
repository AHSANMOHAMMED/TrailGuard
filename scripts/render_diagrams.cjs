const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const diagrams = [
  {
    filename: 'trailguard_uc_diagram.png',
    code: `graph TD
    classDef actorStyle fill:#1F5A43,color:#FFF,stroke:#0A100C,stroke-width:2px;
    classDef goalStyle fill:#3182CE,color:#FFF,stroke:#1A365D,stroke-width:2px;
    classDef offlineStyle fill:#D69E2E,color:#FFF,stroke:#744210,stroke-width:2px;
    classDef ucStyle fill:#F0F5F2,color:#1F5A43,stroke:#3B7A57,stroke-width:1.5px;
    classDef sysStyle fill:#2A4365,color:#FFF,stroke:#1A202C,stroke-width:2px;

    %% Left Actors
    Manager["Park Manager"]:::actorStyle
    Ranger["Field Ranger (Shureka / Ahsan)"]:::actorStyle
    Researcher["Conservation Researcher"]:::actorStyle
    IncManager["Incident Manager"]:::actorStyle

    %% Right Actors
    CollarSys["GPS Collar System"]:::sysStyle
    CameraSys["Camera Trap System"]:::sysStyle
    WildlifeStaff["Wildlife Staff"]:::actorStyle
    Liaison["Community Liaison Officer (Kajana)"]:::actorStyle
    SMS["SMS Gateway (A02)"]:::sysStyle

    subgraph Boundary["Smart Wildlife Conservation & Anti-Poaching System"]
        
        %% Subsystem 1: Ranger Patrol Operations
        subgraph Sub1["1. Ranger Patrol Operations"]
            PatrolGoal["Manage Ranger Patrol Operations"]:::goalStyle
            AssignRoute["Assign Patrol Route"]:::ucStyle
            ViewRoute["View Assigned Patrol Route"]:::ucStyle
            ViewCoverage["View Recent Patrol Coverage"]:::ucStyle
            CompletePatrol["Complete Patrol"]:::ucStyle
            RecPosition["Record Patrol Position"]:::ucStyle
            TrackGPS["Track Position via GPS"]:::ucStyle
            MarkWaypoint["Mark Manual Waypoint"]:::ucStyle
            GaugeCoverage["Calculate 96% Route Coverage (A02)"]:::ucStyle
        end

        %% Subsystem 2: Wildlife Sensors & Risk Alerts
        subgraph Sub2["2. Wildlife Sensors & Risk Alerts"]
            SensorGoal["Monitor Wildlife Sensors & Risk Alerts"]:::goalStyle
            MonCollar["Monitor GPS-Collared Wildlife"]:::ucStyle
            CheckZone["Check Location Against Risk Zone"]:::ucStyle
            GenAlert["Generate Wildlife Risk Alert"]:::ucStyle
            RecCollar["Receive Collar Location"]:::ucStyle
            ViewAlert["View Risk Alert"]:::ucStyle
            RespondAlert["Respond to Risk Alert"]:::ucStyle
            GeofenceEval["Evaluate Farmland Geofences (A02)"]:::ucStyle
            PageUnit["Page Emergency Intervention Unit (A02)"]:::ucStyle
        end

        %% Subsystem 3: Camera Trap Observations
        subgraph Sub3["3. Camera Trap Observations"]
            CamGoal["Process Camera Trap Observations"]:::goalStyle
            RecCamImg["Receive Camera Trap Image"]:::ucStyle
            RevCamImg["Review Camera Trap Image"]:::ucStyle
            FlagPoacher["Flag Suspected Poacher"]:::ucStyle
            IdSpecies["Identify Species"]:::ucStyle
        end

        %% Subsystem 4: Offline Field Data
        subgraph Sub4["4. Offline Field Data"]
            OfflineGoal["Handle Offline Field Data"]:::offlineStyle
            StoreLocal["Store Data Locally"]:::ucStyle
            SyncData["Synchronize Offline Data"]:::ucStyle
            BufferPatrol["Buffer Offline Patrol Data (A02)"]:::ucStyle
        end

        %% Subsystem 5: Incident & Community Reports
        subgraph Sub5["5. Field & Community Incident Reports"]
            IncidentGoal["Manage Field & Community Reports"]:::goalStyle
            SubCommunity["Submit Community Conflict Report"]:::ucStyle
            ReportIncident["Report Field Incident"]:::ucStyle
            RecType["Record Incident Type"]:::ucStyle
            RecGPS["Record Incident GPS Location"]:::ucStyle
            EnterDesc["Enter Incident Description"]:::ucStyle
            CapPhoto["Capture Incident Photo"]:::ucStyle
            VerifyReceipt["Verify Complete-Receipt SHA-256 (A02)"]:::ucStyle
            RevCommunity["Review Community Report"]:::ucStyle
            RespConflict["Respond to Conflict Report"]:::ucStyle
            SmsBridge["Ingest via Rural SMS Gateway (A02)"]:::ucStyle
        end

        %% Subsystem 6: Analysis & Reporting
        subgraph Sub6["6. Conservation Analysis & Reporting"]
            AnalysisGoal["Perform Conservation Analysis & Reporting"]:::goalStyle
            AllocResources["Allocate Ranger Resources"]:::ucStyle
            PlanRoutes["Plan Patrol Routes"]:::ucStyle
            AnalConflict["Analyze Conflict Trends"]:::ucStyle
            AnalHotspots["Analyze Poaching Hotspots"]:::ucStyle
            AnalCoverage["Analyze Patrol Coverage"]:::ucStyle
            GenReport["Generate Statistical Report"]:::ucStyle
        end
    end

    %% Patrol Connections
    Manager --> AssignRoute
    Manager --> ViewCoverage
    Manager --> PatrolGoal
    Ranger --> ViewRoute
    Ranger --> CompletePatrol
    Ranger --> RecPosition
    RecPosition --> TrackGPS
    RecPosition --> MarkWaypoint
    CompletePatrol ..->|<<include>>| GaugeCoverage

    %% Sensor Connections
    CollarSys --> RecCollar
    RecCollar --> MonCollar
    MonCollar --> CheckZone
    CheckZone ..->|<<extend>>| GenAlert
    GenAlert --> ViewAlert
    Ranger --> RespondAlert
    CheckZone ..->|<<include>>| GeofenceEval
    GeofenceEval ..->|<<extend>>| PageUnit
    PageUnit --> Ranger

    %% Camera Connections
    CameraSys --> RecCamImg
    RecCamImg --> RevCamImg
    RevCamImg ..->|<<extend>>| FlagPoacher
    RevCamImg ..->|<<extend>>| IdSpecies
    WildlifeStaff --> RevCamImg
    WildlifeStaff --> FlagPoacher

    %% Offline Connections
    Ranger --> OfflineGoal
    OfflineGoal ..->|<<include>>| StoreLocal
    OfflineGoal ..->|<<extend>>| SyncData
    OfflineGoal ..->|<<extend>>| BufferPatrol

    %% Incident Connections
    Ranger --> ReportIncident
    ReportIncident ..->|<<include>>| RecType
    ReportIncident ..->|<<include>>| RecGPS
    ReportIncident ..->|<<include>>| EnterDesc
    ReportIncident ..->|<<include>>| CapPhoto
    ReportIncident ..->|<<include>>| VerifyReceipt
    Farmer --> SubCommunity
    SMS --> SmsBridge
    SmsBridge ..->|<<extend>>| SubCommunity
    Liaison --> RevCommunity
    Liaison --> RespConflict
    RevCommunity --> RespConflict

    %% Analysis Connections
    Manager --> AnalysisGoal
    Researcher --> AnalysisGoal
    IncManager --> IncidentGoal
    AnalysisGoal --> AllocResources
    AnalysisGoal --> PlanRoutes
    AnalysisGoal --> AnalConflict
    AnalysisGoal --> AnalHotspots
    AnalysisGoal --> AnalCoverage
    AnalysisGoal --> GenReport`
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

    class DeliveryState {
        <<enumeration>>
        PENDING
        SENT
        FAILED
    }

    class PatrolStatus {
        <<enumeration>>
        ACTIVE
        COMPLETED
        CANCELLED
    }

    class AlertStatus {
        <<enumeration>>
        OPEN
        ASSIGNED
        ESCALATED
        CLOSED
    }

    class LocationSource {
        <<enumeration>>
        GPS
        MANUAL
    }

    class Confidence {
        <<enumeration>>
        HIGH
        MEDIUM
        LOW
    }

    class IncidentCategory {
        <<enumeration>>
        SNARE
        CROP_RAID
        POACHING_SIGN
        INJURED_ANIMAL
        OTHER
    }

    class OfficerRole {
        <<enumeration>>
        RANGER
        LIAISON
        MANAGER
        RESEARCHER
    }

    class GeoPoint {
        +Float latitude
        +Float longitude
        +Float altitude
    }

    class GeoPolygon {
        +List~GeoPoint~ coordinates
    }

    class DomainEntity {
        <<abstract>>
        +UUID id
        +DateTime createdAt
        +DateTime updatedAt
        +SyncState syncState
        +DateTime retryAfter
    }

    class Patrol {
        +String patrolId
        +String beatRouteId
        +String routeName
        +String officerId
        +String officerName
        +PatrolStatus status
        +DateTime startedAt
        +DateTime completedAt
        +Float distanceKm
        +Float coveragePct
        +startPatrol()
        +completePatrol()
        +flushTailCoordinates()
    }

    class Waypoint {
        +String pointId
        +GeoPoint geo
        +LocationSource source
        +DateTime recordedAt
        +String label
    }

    class IncidentReport {
        +String reportId
        +IncidentCategory category
        +String description
        +GeoPoint geo
        +LocationSource locationSource
        +DateTime observedAt
        +Boolean completeReceipt
    }

    class PhotoAttachment {
        +String attachId
        +String uri
        +String mimeType
        +String sha256Digest
        +SyncState syncState
    }

    class Officer {
        +String officerId
        +String name
        +OfficerRole role
        +Boolean available
    }

    class RiskZone {
        +String zoneId
        +String name
        +GeoPolygon polygon
        +Integer freshnessMinutes
    }

    class WildlifeAlert {
        +String alertId
        +String animal
        +String zoneId
        +String zoneName
        +Confidence confidence
        +AlertStatus status
        +DateTime observedAt
        +DateTime receivedAt
    }

    class ResponseAssignment {
        +String raId
        +String alertId
        +String officerId
        +String officerName
        +DeliveryState deliveryState
        +DateTime acknowledgedAt
        +DateTime createdAt
        +DateTime supersededAt
        +String outcome
    }

    class ConflictReport {
        +String ticketId
        +String channel
        +String villageSector
        +Integer herdSize
        +String damageCategory
        +String complainantPhone
        +Float valuationAmount
        +String assignedUnit
    }

    class ConservationReport {
        +String reportId
        +String park
        +String fromDate
        +String toDate
        +DateTime cutoff
        +DateTime generatedAt
        +Integer incidentCount
        +Integer patrolCount
        +Float coveragePercent
        +Integer conflictCount
    }

    class SyncAck {
        +String recordId
        +Integer version
        +Boolean complete
        +DateTime receivedAt
    }

    class ConservationApi {
        <<interface>>
        +upsertPatrol(p: Patrol) SyncAck
        +upsertIncident(i: IncidentReport, attachments: PhotoAttachment[]) SyncAck
    }

    class FieldStore {
        <<interface>>
        +getPatrols() List~Patrol~
        +savePatrol(p: Patrol)
        +getIncidents() List~IncidentReport~
        +saveIncident(i: IncidentReport)
        +pending(now: DateTime) List~PendingRecord~
        +markPatrolSynced(id: String)
        +markIncidentFailed(id: String, retryAfter: DateTime)
    }

    class PatrolOpsService {
        <<service>>
        +startPatrol() Patrol
        +recordWaypoint() Waypoint
        +completePatrol() Patrol
        +flushTailPoints()
    }

    class IncidentOpsService {
        <<service>>
        +submitIncident() IncidentReport
        +attachPhoto() PhotoAttachment
        +verifyCompleteReceipt() SyncAck
    }

    class AlertTriageService {
        <<service>>
        +ingestCollarTelemetry() WildlifeAlert
        +evaluateGeofences() Boolean
        +pageEmergencyUnit() ResponseAssignment
        +acknowledgeAlert() Alert
        +resolveAlert() Alert
    }

    class ConflictIntakeService {
        <<service>>
        +ingestAppReport() ConflictReport
        +ingestSmsPacket() ConflictReport
        +assignResponseUnit() ResponseAssignment
        +logCompensationValuation() ConflictReport
    }

    class SyncService {
        <<service>>
        +syncPendingRecords() SyncResult
        +handleCompleteReceipt() SyncAck
    }

    class TrailGuardAppStore {
        <<controller>>
        +OfficerRole activeRole
        +Patrol activePatrol
        +List~IncidentReport~ incidents
        +List~WildlifeAlert~ alerts
        +List~ConflictReport~ conflictReports
        +Boolean dayNightTheme
        +setRole()
        +toggleTheme()
        +syncQueue()
    }

    DomainEntity <|-- Patrol
    DomainEntity <|-- Waypoint
    DomainEntity <|-- IncidentReport
    DomainEntity <|-- PhotoAttachment
    DomainEntity <|-- WildlifeAlert
    DomainEntity <|-- ResponseAssignment
    DomainEntity <|-- ConflictReport
    DomainEntity <|-- ConservationReport

    Patrol "1" *-- "0..*" Waypoint : contains
    IncidentReport "1" *-- "0..*" PhotoAttachment : attaches
    WildlifeAlert "1" o-- "0..*" ResponseAssignment : dispatches
    Patrol ..> GeoPoint : uses
    IncidentReport ..> GeoPoint : uses
    RiskZone "1" *-- "1" GeoPolygon : bounded by

    PatrolOpsService ..> Patrol : manages
    IncidentOpsService ..> IncidentReport : manages
    AlertTriageService ..> WildlifeAlert : triages
    ConflictIntakeService ..> ConflictReport : ingests
    SyncService ..> FieldStore : drains queue
    SyncService ..> ConservationApi : calls gateway
    TrailGuardAppStore ..> PatrolOpsService : delegates
    TrailGuardAppStore ..> IncidentOpsService : delegates
    TrailGuardAppStore ..> AlertTriageService : delegates
    TrailGuardAppStore ..> ConflictIntakeService : delegates`
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
