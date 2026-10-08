/**
 * LocalStore — offline SQLite persistence (expo-sqlite).
 * Field writes land here first; sync_queue tracks PENDING → SYNCED | FAILED.
 */
import * as SQLite from 'expo-sqlite';
import { v4 as uuidv4 } from 'uuid';
import type {
  ConflictRecord,
  IncidentReport,
  Patrol,
  SyncEntityType,
  SyncState,
  Waypoint,
} from '../types/models';

const db = SQLite.openDatabaseSync('trailguard.db');

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS patrols (
    patrol_id TEXT PRIMARY KEY NOT NULL,
    route_id TEXT NOT NULL,
    officer_id TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    sync_state TEXT NOT NULL,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS waypoints (
    point_id TEXT PRIMARY KEY NOT NULL,
    patrol_id TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    source TEXT NOT NULL,
    recorded_at TEXT NOT NULL,
    sync_state TEXT NOT NULL,
    FOREIGN KEY (patrol_id) REFERENCES patrols(patrol_id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_waypoints_patrol ON waypoints(patrol_id);

  CREATE TABLE IF NOT EXISTS incidents (
    report_id TEXT PRIMARY KEY NOT NULL,
    sync_state TEXT NOT NULL,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS conflicts (
    conflict_id TEXT PRIMARY KEY NOT NULL,
    sync_state TEXT NOT NULL,
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sync_queue (
    queue_id TEXT PRIMARY KEY NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    sync_state TEXT NOT NULL,
    payload TEXT NOT NULL,
    last_error TEXT,
    updated_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_sync_queue_entity
    ON sync_queue(entity_type, entity_id);

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`;

let initialized = false;

export function initLocalStore() {
  if (initialized) return;
  db.execSync(SCHEMA);
  initialized = true;
}

export function getSetting(key: string): string | null {
  initLocalStore();
  const row = db.getFirstSync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  initLocalStore();
  if (!value) {
    db.runSync('DELETE FROM app_settings WHERE key = ?', [key]);
    return;
  }
  db.runSync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

function nowIso() {
  return new Date().toISOString();
}

function enqueueSync(entityType: SyncEntityType, entityId: string, payload: object) {
  const updatedAt = nowIso();
  db.runSync(
    `INSERT INTO sync_queue (queue_id, entity_type, entity_id, sync_state, payload, last_error, updated_at)
     VALUES (?, ?, ?, 'PENDING', ?, NULL, ?)
     ON CONFLICT(entity_type, entity_id) DO UPDATE SET
       sync_state = 'PENDING',
       payload = excluded.payload,
       last_error = NULL,
       updated_at = excluded.updated_at`,
    [uuidv4(), entityType, entityId, JSON.stringify(payload), updatedAt]
  );
}

function upsertWaypoints(patrolId: string, waypoints: Waypoint[], syncState: SyncState) {
  for (const w of waypoints) {
    db.runSync(
      `INSERT INTO waypoints (point_id, patrol_id, lat, lng, source, recorded_at, sync_state)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(point_id) DO UPDATE SET
         lat = excluded.lat,
         lng = excluded.lng,
         source = excluded.source,
         recorded_at = excluded.recorded_at,
         sync_state = excluded.sync_state`,
      [w.pointId, patrolId, w.geo.lat, w.geo.lng, w.source, w.recordedAt, syncState]
    );
  }
}

export function savePatrol(patrol: Patrol) {
  initLocalStore();
  const updatedAt = nowIso();
  const syncState = patrol.syncState ?? 'PENDING';
  db.runSync(
    `INSERT INTO patrols
      (patrol_id, route_id, officer_id, status, started_at, completed_at, sync_state, payload, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(patrol_id) DO UPDATE SET
       route_id = excluded.route_id,
       officer_id = excluded.officer_id,
       status = excluded.status,
       started_at = excluded.started_at,
       completed_at = excluded.completed_at,
       sync_state = excluded.sync_state,
       payload = excluded.payload,
       updated_at = excluded.updated_at`,
    [
      patrol.patrolId,
      patrol.routeId,
      patrol.officerId,
      patrol.status,
      patrol.startedAt,
      patrol.completedAt ?? null,
      syncState,
      JSON.stringify(patrol),
      updatedAt,
    ]
  );
  upsertWaypoints(patrol.patrolId, patrol.waypoints ?? [], syncState);
  if (syncState === 'PENDING') {
    enqueueSync('patrol', patrol.patrolId, patrol);
  }
}

export function saveIncident(incident: IncidentReport) {
  initLocalStore();
  const updatedAt = nowIso();
  const syncState = incident.syncState ?? 'PENDING';
  db.runSync(
    `INSERT INTO incidents (report_id, sync_state, payload, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(report_id) DO UPDATE SET
       sync_state = excluded.sync_state,
       payload = excluded.payload,
       updated_at = excluded.updated_at`,
    [incident.reportId, syncState, JSON.stringify(incident), updatedAt]
  );
  if (syncState === 'PENDING') {
    enqueueSync('incident', incident.reportId, incident);
  }
}

export function saveConflict(conflict: ConflictRecord) {
  initLocalStore();
  const updatedAt = nowIso();
  const syncState = conflict.syncState ?? 'PENDING';
  db.runSync(
    `INSERT INTO conflicts (conflict_id, sync_state, payload, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(conflict_id) DO UPDATE SET
       sync_state = excluded.sync_state,
       payload = excluded.payload,
       updated_at = excluded.updated_at`,
    [conflict.conflictId, syncState, JSON.stringify(conflict), updatedAt]
  );
  if (syncState === 'PENDING') {
    enqueueSync('conflict', conflict.conflictId, conflict);
  }
}

export interface PendingQueueItem {
  queueId: string;
  entityType: SyncEntityType;
  entityId: string;
  payload: unknown;
}

export function pendingQueue(): PendingQueueItem[] {
  initLocalStore();
  const rows = db.getAllSync(
    `SELECT queue_id, entity_type, entity_id, payload
     FROM sync_queue WHERE sync_state = 'PENDING'
     ORDER BY updated_at ASC`
  ) as { queue_id: string; entity_type: SyncEntityType; entity_id: string; payload: string }[];
  return rows.map((r) => ({
    queueId: r.queue_id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    payload: JSON.parse(r.payload),
  }));
}

/** @deprecated Prefer pendingQueue — kept for callers that list patrol payloads only */
export function pendingPatrols(): Patrol[] {
  initLocalStore();
  const rows = db.getAllSync(`SELECT payload FROM patrols WHERE sync_state = 'PENDING'`) as {
    payload: string;
  }[];
  return rows.map((r) => JSON.parse(r.payload) as Patrol);
}

/** @deprecated Prefer pendingQueue */
export function pendingIncidents(): IncidentReport[] {
  initLocalStore();
  const rows = db.getAllSync(`SELECT payload FROM incidents WHERE sync_state = 'PENDING'`) as {
    payload: string;
  }[];
  return rows.map((r) => JSON.parse(r.payload) as IncidentReport);
}

export function pendingConflicts(): ConflictRecord[] {
  initLocalStore();
  const rows = db.getAllSync(`SELECT payload FROM conflicts WHERE sync_state = 'PENDING'`) as {
    payload: string;
  }[];
  return rows.map((r) => JSON.parse(r.payload) as ConflictRecord);
}

const ENTITY_TABLE: Record<SyncEntityType, { table: string; idCol: string }> = {
  patrol: { table: 'patrols', idCol: 'patrol_id' },
  incident: { table: 'incidents', idCol: 'report_id' },
  conflict: { table: 'conflicts', idCol: 'conflict_id' },
};

export function markSynced(entityType: SyncEntityType, entityId: string) {
  initLocalStore();
  const updatedAt = nowIso();
  db.runSync(
    `UPDATE sync_queue SET sync_state = 'SYNCED', last_error = NULL, updated_at = ? 
     WHERE entity_type = ? AND entity_id = ?`,
    [updatedAt, entityType, entityId]
  );
  const meta = ENTITY_TABLE[entityType];
  db.runSync(`UPDATE ${meta.table} SET sync_state = 'SYNCED', updated_at = ? WHERE ${meta.idCol} = ?`, [
    updatedAt,
    entityId,
  ]);
  if (entityType === 'patrol') {
    db.runSync(`UPDATE waypoints SET sync_state = 'SYNCED' WHERE patrol_id = ?`, [entityId]);
  }
}

/** @deprecated Use markSynced(entityType, id) */
export function markSyncedLegacy(table: 'patrols' | 'incidents', id: string) {
  const entityType = table === 'patrols' ? 'patrol' : 'incident';
  markSynced(entityType, id);
}

export function markFailed(entityType: SyncEntityType, entityId: string, error: string) {
  initLocalStore();
  const updatedAt = nowIso();
  db.runSync(
    `UPDATE sync_queue SET sync_state = 'FAILED', last_error = ?, updated_at = ?
     WHERE entity_type = ? AND entity_id = ?`,
    [error.slice(0, 500), updatedAt, entityType, entityId]
  );
  const meta = ENTITY_TABLE[entityType];
  db.runSync(`UPDATE ${meta.table} SET sync_state = 'FAILED', updated_at = ? WHERE ${meta.idCol} = ?`, [
    updatedAt,
    entityId,
  ]);
}

export function getWaypointsForPatrol(patrolId: string): Waypoint[] {
  initLocalStore();
  const rows = db.getAllSync(
    `SELECT point_id, lat, lng, source, recorded_at FROM waypoints
     WHERE patrol_id = ? ORDER BY recorded_at ASC`,
    [patrolId]
  ) as { point_id: string; lat: number; lng: number; source: string; recorded_at: string }[];
  return rows.map((r) => ({
    pointId: r.point_id,
    geo: { lat: r.lat, lng: r.lng },
    source: r.source as Waypoint['source'],
    recordedAt: r.recorded_at,
  }));
}

export function getRecentWaypoints(limit = 30): Waypoint[] {
  initLocalStore();
  const rows = db.getAllSync(
    `SELECT point_id, lat, lng, source, recorded_at FROM waypoints
     ORDER BY recorded_at DESC LIMIT ?`,
    [limit]
  ) as { point_id: string; lat: number; lng: number; source: string; recorded_at: string }[];
  return rows
    .map((r) => ({
      pointId: r.point_id,
      geo: { lat: r.lat, lng: r.lng },
      source: r.source as Waypoint['source'],
      recordedAt: r.recorded_at,
    }))
    .reverse();
}

export function countPendingSync(): number {
  initLocalStore();
  const row = db.getFirstSync(`SELECT COUNT(*) AS c FROM sync_queue WHERE sync_state = 'PENDING'`) as {
    c: number;
  };
  return row?.c ?? 0;
}
