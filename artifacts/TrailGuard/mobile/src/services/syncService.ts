/**
 * SyncService — drain sync_queue PENDING rows and upsert to the API (idempotent UUIDs).
 */
import * as LocalStore from '../store/localStore';
import type { ConflictRecord, IncidentReport, Patrol, SyncEntityType } from '../types/models';
import { isApiConfigured, upsert } from './api';

export interface SyncResult {
  patrols: number;
  incidents: number;
  conflicts: number;
  errors: string[];
}

function patrolPayload(p: Patrol) {
  return {
    patrol_id: p.patrolId,
    route_id: p.routeId,
    officer_id: p.officerId,
    status: p.status,
    started_at: p.startedAt,
    completed_at: p.completedAt,
    waypoints: (p.waypoints || []).map((w) => ({
      point_id: w.pointId,
      geo: w.geo,
      source: w.source,
      recorded_at: w.recordedAt,
    })),
  };
}

function incidentPayload(ir: IncidentReport) {
  return {
    report_id: ir.reportId,
    park_id: ir.parkId,
    type: ir.type,
    description: ir.description,
    geo: ir.geo,
    location_source: ir.locationSource,
    observed_at: ir.observedAt,
    attachments: (ir.attachments || []).map((a) => ({
      attach_id: a.attachId,
      uri: a.uri,
      mime_type: a.mimeType,
    })),
  };
}

function conflictPayload(c: ConflictRecord) {
  return {
    conflict_id: c.conflictId,
    park_id: c.parkId,
    species: c.species,
    risk_level: c.riskLevel,
    geo: c.geo,
    observed_at: c.observedAt,
    notes: c.notes,
  };
}

async function pushEntity(entityType: SyncEntityType, payload: unknown): Promise<boolean> {
  switch (entityType) {
    case 'patrol': {
      const ack = await upsert('patrol', patrolPayload(payload as Patrol));
      return ack.complete;
    }
    case 'incident': {
      const ack = await upsert('incident', incidentPayload(payload as IncidentReport));
      return ack.complete;
    }
    case 'conflict': {
      const ack = await upsert('conflict', conflictPayload(payload as ConflictRecord));
      return ack.complete;
    }
    default:
      return false;
  }
}

export async function synchronize(): Promise<SyncResult> {
  const errors: string[] = [];
  let patrols = 0;
  let incidents = 0;
  let conflicts = 0;

  if (!isApiConfigured()) {
    return {
      patrols: 0,
      incidents: 0,
      conflicts: 0,
      errors: [
        'Set EXPO_PUBLIC_API_URL to the shared host /api/v1 so all phones sync to one DB (SQLite stays PENDING offline until then).',
      ],
    };
  }

  for (const item of LocalStore.pendingQueue()) {
    try {
      const complete = await pushEntity(item.entityType, item.payload);
      if (complete) {
        LocalStore.markSynced(item.entityType, item.entityId);
        if (item.entityType === 'patrol') patrols += 1;
        else if (item.entityType === 'incident') incidents += 1;
        else conflicts += 1;
      } else {
        const msg = `${item.entityType} ${item.entityId}: server ack incomplete`;
        errors.push(msg);
        LocalStore.markFailed(item.entityType, item.entityId, msg);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      errors.push(`${item.entityType} ${item.entityId}: ${message}`);
      LocalStore.markFailed(item.entityType, item.entityId, message);
    }
  }

  return { patrols, incidents, conflicts, errors };
}
