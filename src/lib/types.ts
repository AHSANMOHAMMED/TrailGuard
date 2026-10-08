export type SyncState = "PENDING" | "SYNCED" | "FAILED";
export type LocationSource = "GPS" | "MANUAL";
export type PatrolStatus = "ACTIVE" | "COMPLETED";
export type AlertStatus = "OPEN" | "ASSIGNED" | "CLOSED";
export type DeliveryState = "PENDING" | "SENT" | "FAILED";

export interface Waypoint {
  pointId: string;
  lat: number;
  lng: number;
  source: LocationSource;
  recordedAt: string;
  label?: string;
}

export interface Patrol {
  patrolId: string;
  routeId: string;
  routeName: string;
  officerId: string;
  officerName: string;
  status: PatrolStatus;
  startedAt: string;
  completedAt?: string;
  syncState: SyncState;
  waypoints: Waypoint[];
  /** Total PatrolPositions recorded (GPS + manual) during the patrol (UC01). */
  positions?: number;
  /** Patrol coverage achieved for the route, percent (UC01, R-07 formula). */
  coveragePct?: number;
  /** Backoff schedule while FAILED (S2/R-05) — exponential, capped at 30 min. */
  retryAfter?: string;
  /** Upload attempts so far — drives the backoff exponent. */
  syncAttempts?: number;
  /** Last transport failure reason, surfaced in the UC01b queue (R-02a). */
  failureReason?: string;
}

export interface Incident {
  reportId: string;
  type: string;
  description: string;
  lat: number;
  lng: number;
  locationSource: LocationSource;
  observedAt: string;
  syncState: SyncState;
  hasPhoto: boolean;
  /** Backoff schedule while FAILED (S2/R-05). */
  retryAfter?: string;
  syncAttempts?: number;
  failureReason?: string;
}

export interface Alert {
  alertId: string;
  animal: string;
  /** GPS tracking collar id, e.g. EL-07 (UC03). */
  collar?: string;
  zone: string;
  observedAt: string;
  receivedAt: string;
  confidence: "High" | "Medium" | "Low";
  status: AlertStatus;
  acknowledgedAt?: string;
  resolvedAt?: string;
  outcome?: string;
  resolutionNote?: string;
}

/** UC04 — community human-wildlife conflict report. */
export interface ConflictReport {
  reportId: string;
  type: string;
  location: string;
  channel: "Mobile App" | "SMS";
  description: string;
  status: "SUBMITTED" | "RESPONDED";
  highPriority: boolean;
  receivedAt: string;
  respondedAt?: string;
  syncState: SyncState;
  /** Backoff schedule while FAILED (S2/R-05). */
  retryAfter?: string;
  syncAttempts?: number;
  failureReason?: string;
}

/** Field radio — a push-to-talk transmission on a channel frequency. */
export interface RadioMessage {
  messageId: string;
  /** Channel id, e.g. "OPS-1" (see RADIO_CHANNELS). */
  channel: string;
  fromRole: "RANGER" | "LIAISON" | "MANAGER";
  fromTitle: string;
  kind: "voice" | "text";
  /** Text transmission body. */
  text?: string;
  /** Voice-note length in seconds. */
  durationS?: number;
  transmittedAt: string;
  syncState: SyncState;
}

export interface ReportSnapshot {
  reportId: string;
  park: string;
  from: string;
  to: string;
  cutoff: string;
  generatedAt: string;
  incidentCount: number;
  patrolCount: number;
  coveragePercent: number;
  conflictCount: number;
  byType: Record<string, number>;
}
