/**
 * SyncService — push PENDING records when connectivity returns.
 * Uses stable UUIDs; server upsert is idempotent.
 */
import * as LocalStore from '../store/localStore';
import { upsert } from './api';

export async function synchronize(): Promise<{ patrols: number; incidents: number; errors: string[] }> {
  const errors: string[] = [];
  let patrols = 0;
  let incidents = 0;

  for (const p of LocalStore.pendingPatrols()) {
    try {
      const ack = await upsert('patrol', {
        patrol_id: p.patrolId,
        route_id: p.routeId,
        officer_id: p.officerId,
        status: p.status,
        started_at: p.startedAt,
        completed_at: p.completedAt,
        waypoints: (p.waypoints || []).map((w: any) => ({
          point_id: w.pointId,
          geo: w.geo,
          source: w.source,
          recorded_at: w.recordedAt,
        })),
      });
      if (ack.complete) {
        LocalStore.markSynced('patrols', p.patrolId);
        patrols += 1;
      }
    } catch (e: any) {
      errors.push(`patrol ${p.patrolId}: ${e.message}`);
    }
  }

  for (const ir of LocalStore.pendingIncidents()) {
    try {
      const ack = await upsert('incident', {
        report_id: ir.reportId,
        park_id: ir.parkId,
        type: ir.type,
        description: ir.description,
        geo: ir.geo,
        location_source: ir.locationSource,
        observed_at: ir.observedAt,
        attachments: (ir.attachments || []).map((a: any) => ({
          attach_id: a.attachId,
          uri: a.uri,
          mime_type: a.mimeType,
        })),
      });
      if (ack.complete) {
        LocalStore.markSynced('incidents', ir.reportId);
        incidents += 1;
      } else {
        errors.push(`incident ${ir.reportId}: complete-receipt not yet available`);
      }
    } catch (e: any) {
      errors.push(`incident ${ir.reportId}: ${e.message}`);
    }
  }

  return { patrols, incidents, errors };
}
