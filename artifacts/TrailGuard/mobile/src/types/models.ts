export type UUID = string;
export type SyncState = 'PENDING' | 'SYNCED' | 'FAILED';
export type PatrolStatus = 'ACTIVE' | 'COMPLETED';
export type LocationSource = 'GPS' | 'MANUAL';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Waypoint {
  pointId: UUID;
  geo: GeoPoint;
  source: LocationSource;
  recordedAt: string;
}

export interface Patrol {
  patrolId: UUID;
  routeId: UUID;
  officerId: UUID;
  status: PatrolStatus;
  startedAt: string;
  completedAt?: string;
  syncState: SyncState;
  waypoints: Waypoint[];
}

export interface IncidentReport {
  reportId: UUID;
  parkId: UUID;
  type: string;
  description: string;
  geo: GeoPoint;
  locationSource: LocationSource;
  observedAt: string;
  syncState: SyncState;
  attachments: { attachId: UUID; uri: string; mimeType: string }[];
}
