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
}

export interface Officer {
  officerId: string;
  name: string;
  role: "RANGER" | "LIAISON" | "MANAGER";
  available: boolean;
}

export interface Alert {
  alertId: string;
  animal: string;
  zone: string;
  observedAt: string;
  receivedAt: string;
  confidence: "High" | "Medium" | "Low";
  status: AlertStatus;
}

export interface Assignment {
  raId: string;
  alertId: string;
  officerId: string;
  officerName: string;
  deliveryState: DeliveryState;
  acknowledgedAt?: string;
  createdAt: string;
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
