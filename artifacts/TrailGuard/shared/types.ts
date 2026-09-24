/** Shared domain types — TrailGuard */

export type UUID = string;
export type SyncState = 'PENDING' | 'SYNCED' | 'FAILED';
export type PatrolStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type OfficerRole = 'RANGER' | 'LIAISON' | 'MANAGER';
export type DeliveryState = 'PENDING' | 'SENT' | 'FAILED';
export type LocationSource = 'GPS' | 'MANUAL';

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracyM?: number;
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

export interface Waypoint {
  pointId: UUID;
  patrolId: UUID;
  geo: GeoPoint;
  source: LocationSource;
  recordedAt: string;
}

export interface IncidentReport {
  reportId: UUID;
  type: string;
  description: string;
  geo: GeoPoint;
  locationSource: LocationSource;
  observedAt: string;
  syncState: SyncState;
  attachments: PhotoAttachment[];
}

export interface PhotoAttachment {
  attachId: UUID;
  reportId: UUID;
  uri: string;
  mimeType: string;
}

export interface Alert {
  alertId: UUID;
  animalId?: UUID;
  zoneId: UUID;
  status: 'OPEN' | 'ASSIGNED' | 'CLOSED';
  confidence: string;
  observedAt: string;
  receivedAt: string;
}

export interface ResponseAssignment {
  raId: UUID;
  alertId: UUID;
  officerId: UUID;
  deliveryState: DeliveryState;
  acknowledgedAt?: string;
}

export interface ReportCriteria {
  parkId: UUID;
  from: string;
  to: string;
  categories: string[];
}

export interface ConservationReport {
  reportId: UUID;
  criteria: ReportCriteria;
  cutoff: string;
  generatedAt: string;
  incidentCount: number;
  coveragePercent: number;
  conflictTrendPercent: number;
}

export interface Ack {
  id: UUID;
  version: number;
  complete: boolean;
}
