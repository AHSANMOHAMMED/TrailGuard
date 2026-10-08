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

export interface ConflictRecord {
  conflictId: UUID;
  parkId: UUID;
  species: string;
  riskLevel: string;
  geo: GeoPoint;
  observedAt: string;
  syncState: SyncState;
  notes?: string;
}

export type SyncEntityType = 'patrol' | 'incident' | 'conflict';

export interface SyncQueueRow {
  queueId: UUID;
  entityType: SyncEntityType;
  entityId: UUID;
  syncState: SyncState;
  payload: string;
  lastError: string | null;
  updatedAt: string;
}
