/**
 * LocalStore — offline SQLite persistence.
 * All field writes land here first with syncState=PENDING.
 */
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('trailguard.db');

export function initLocalStore() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS patrols (
      patrol_id TEXT PRIMARY KEY NOT NULL,
      route_id TEXT NOT NULL,
      officer_id TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      sync_state TEXT NOT NULL,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS incidents (
      report_id TEXT PRIMARY KEY NOT NULL,
      sync_state TEXT NOT NULL,
      payload TEXT NOT NULL
    );
  `);
}

export function savePatrol(patrol: object & { patrolId: string; syncState: string }) {
  db.runSync(
    `INSERT OR REPLACE INTO patrols
      (patrol_id, route_id, officer_id, status, started_at, completed_at, sync_state, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      (patrol as any).patrolId,
      (patrol as any).routeId,
      (patrol as any).officerId,
      (patrol as any).status,
      (patrol as any).startedAt,
      (patrol as any).completedAt ?? null,
      patrol.syncState,
      JSON.stringify(patrol),
    ]
  );
}

export function saveIncident(incident: object & { reportId: string; syncState: string }) {
  db.runSync(
    `INSERT OR REPLACE INTO incidents (report_id, sync_state, payload) VALUES (?, ?, ?)`,
    [(incident as any).reportId, incident.syncState, JSON.stringify(incident)]
  );
}

export function pendingPatrols(): any[] {
  const rows = db.getAllSync(`SELECT payload FROM patrols WHERE sync_state = 'PENDING'`) as any[];
  return rows.map((r) => JSON.parse(r.payload));
}

export function pendingIncidents(): any[] {
  const rows = db.getAllSync(`SELECT payload FROM incidents WHERE sync_state = 'PENDING'`) as any[];
  return rows.map((r) => JSON.parse(r.payload));
}

export function markSynced(table: 'patrols' | 'incidents', id: string) {
  const col = table === 'patrols' ? 'patrol_id' : 'report_id';
  db.runSync(`UPDATE ${table} SET sync_state = 'SYNCED' WHERE ${col} = ?`, [id]);
}
