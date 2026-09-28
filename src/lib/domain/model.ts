import type {
  AlertStatus,
  Confidence,
  DeliveryState,
  IncidentCategory,
  LocationSource,
  OfficerRole,
  PatrolStatus,
  SyncState,
} from "./enums";
import type { GeoPoint } from "./geo";

/**
 * Domain entities (A02 R-03). Entities own their state transitions via the
 * pure transition helpers in `transitions.ts`; services are the only writers
 * of sync/delivery state. `uid` and timestamps are injected by services so
 * tests stay deterministic.
 */

export interface Waypoint {
  pointId: string;
  geo: GeoPoint;
  source: LocationSource;
  recordedAt: string; // ISO
  label?: string;
}

export interface Patrol {
  patrolId: string;
  routeId: string;
  routeName: string;
  officerId: string;
  officerName: string;
  status: PatrolStatus;
  startedAt: string; // ISO
  completedAt?: string; // ISO
  syncState: SyncState;
  /** Set when the record failed to upload; drives the retry schedule (R-05). */
  retryAfter?: string; // ISO
  waypoints: Waypoint[];
}

export interface PhotoAttachment {
  attachId: string;
  uri: string;
  mimeType: string;
  /** Per-attachment sync state — enables the partial-upload branch (S3/R-05). */
  syncState: SyncState;
}

export interface IncidentReport {
  reportId: string;
  category: IncidentCategory;
  description: string;
  geo: GeoPoint;
  locationSource: LocationSource;
  observedAt: string; // ISO
  syncState: SyncState;
  retryAfter?: string; // ISO
  attachments: PhotoAttachment[];
}

export interface Officer {
  officerId: string;
  name: string;
  role: OfficerRole;
  available: boolean;
}

export interface RiskZone {
  zoneId: string;
  name: string;
  polygon: import("./geo").GeoPolygon;
  freshnessMinutes: number;
}

export interface Alert {
  alertId: string;
  animal: string;
  zoneId: string;
  zoneName: string;
  confidence: Confidence;
  status: AlertStatus;
  observedAt: string; // ISO
  receivedAt: string; // ISO
}

export interface ResponseAssignment {
  raId: string;
  alertId: string;
  officerId: string;
  officerName: string;
  deliveryState: DeliveryState;
  acknowledgedAt?: string; // ISO
  createdAt: string; // ISO
  outcome?: string;
}

export interface ReportCriteria {
  park: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

export interface ConservationReport {
  reportId: string;
  park: string;
  from: string;
  to: string;
  cutoff: string; // ISO
  generatedAt: string; // ISO
  incidentCount: number;
  patrolCount: number;
  coveragePercent: number;
  conflictCount: number;
  byCategory: Record<string, number>;
}

/**
 * Server acknowledgement for one record (R-03: the A01 diagram referenced an
 * undeclared `Ack`; the complete-receipt concept now has a first-class type).
 * `complete: false` means the report text acked but some attachments did not —
 * the partial-upload branch (S3/R-05).
 */
export interface SyncAck {
  recordId: string;
  version: number;
  complete: boolean;
  receivedAt: string; // ISO
}

export interface SyncResult {
  patrols: number;
  incidents: number;
  /** Report-acked incidents whose attachments remain PENDING (S3/R-05). */
  partialIncidents: number;
  failed: number;
  failures: Array<{ recordId: string; reason: string }>;
}
