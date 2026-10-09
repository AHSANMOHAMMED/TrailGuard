import { getSql } from "@/lib/db";
import type {
  AlertUpsertInput,
  ConflictUpsertInput,
  IncidentUpsertInput,
  PatrolUpsertInput,
  RadioUpsertInput,
} from "./conservation-api";

export async function upsertPatrolRecord(data: PatrolUpsertInput) {
  const sql = await getSql();
  await sql`
    insert into field_patrols (
      patrol_id, route_id, route_name, officer_id, officer_name,
      status, started_at, completed_at, waypoints, updated_at
    ) values (
      ${data.patrolId}, ${data.routeId}, ${data.routeName},
      ${data.officerId}, ${data.officerName}, ${data.status},
      ${data.startedAt}, ${data.completedAt ?? null},
      ${JSON.stringify(data.waypoints)}::jsonb, now()
    )
    on conflict (patrol_id) do update set
      route_id = excluded.route_id,
      route_name = excluded.route_name,
      officer_id = excluded.officer_id,
      officer_name = excluded.officer_name,
      status = excluded.status,
      started_at = excluded.started_at,
      completed_at = excluded.completed_at,
      waypoints = excluded.waypoints,
      updated_at = now()
  `;
  return { complete: true as const };
}

export async function upsertIncidentRecord(data: IncidentUpsertInput) {
  const sql = await getSql();
  const photoState = data.complete
    ? data.hasPhoto
      ? "SYNCED"
      : (data.photoSyncState ?? null)
    : data.hasPhoto
      ? "PENDING"
      : null;
  await sql`
    insert into field_incidents (
      report_id, category, description, lat, lng, location_source,
      observed_at, has_photo, photo_attach_id, photo_sync_state,
      attachments, updated_at
    ) values (
      ${data.reportId}, ${data.category}, ${data.description},
      ${data.lat}, ${data.lng}, ${data.locationSource},
      ${data.observedAt}, ${data.hasPhoto},
      ${data.photoAttachId ?? null}, ${photoState},
      ${JSON.stringify(data.attachments)}::jsonb, now()
    )
    on conflict (report_id) do update set
      category = excluded.category,
      description = excluded.description,
      lat = excluded.lat,
      lng = excluded.lng,
      location_source = excluded.location_source,
      observed_at = excluded.observed_at,
      has_photo = excluded.has_photo,
      photo_attach_id = excluded.photo_attach_id,
      photo_sync_state = excluded.photo_sync_state,
      attachments = excluded.attachments,
      updated_at = now()
  `;
  return { complete: data.complete };
}

export async function upsertConflictRecord(data: ConflictUpsertInput) {
  const sql = await getSql();
  await sql`
    insert into field_conflicts (
      report_id, type, location, channel, description,
      desk_status, lat, lng, updated_at
    ) values (
      ${data.reportId}, ${data.type}, ${data.location}, ${data.channel},
      ${data.description}, ${data.deskStatus ?? null},
      ${data.lat ?? null}, ${data.lng ?? null}, now()
    )
    on conflict (report_id) do update set
      type = excluded.type,
      location = excluded.location,
      channel = excluded.channel,
      description = excluded.description,
      desk_status = excluded.desk_status,
      lat = excluded.lat,
      lng = excluded.lng,
      updated_at = now()
  `;
  return { complete: true as const };
}

export async function upsertRadioRecord(data: RadioUpsertInput) {
  const sql = await getSql();
  await sql`
    insert into field_radio (message_id, channel, body, sync_state, updated_at)
    values (${data.messageId}, ${data.channel}, ${data.body ?? null}, 'SYNCED', now())
    on conflict (message_id) do update set
      channel = excluded.channel,
      body = excluded.body,
      sync_state = 'SYNCED',
      updated_at = now()
  `;
  return { complete: true as const };
}

export async function upsertAlertRecord(data: AlertUpsertInput) {
  const sql = await getSql();
  await sql`
    insert into field_alerts (
      alert_id, animal, collar, zone, observed_at, received_at,
      confidence, status, assignee_id, assignee_name, outcome,
      resolution_note, updated_at
    ) values (
      ${data.alertId}, ${data.animal}, ${data.collar ?? null}, ${data.zone},
      ${data.observedAt}, ${data.receivedAt}, ${data.confidence}, ${data.status},
      ${data.assigneeId ?? null}, ${data.assigneeName ?? null},
      ${data.outcome ?? null}, ${data.resolutionNote ?? null}, now()
    )
    on conflict (alert_id) do update set
      animal = excluded.animal,
      collar = excluded.collar,
      zone = excluded.zone,
      observed_at = excluded.observed_at,
      received_at = excluded.received_at,
      confidence = excluded.confidence,
      status = excluded.status,
      assignee_id = excluded.assignee_id,
      assignee_name = excluded.assignee_name,
      outcome = excluded.outcome,
      resolution_note = excluded.resolution_note,
      updated_at = now()
  `;
  return { complete: true as const };
}

export async function listFieldCounts() {
  const sql = await getSql();
  const rows = await sql<{
    patrols: number;
    incidents: number;
    conflicts: number;
    radio: number;
    alerts: number;
  }>`
    select
      (select count(*)::int from field_patrols) as patrols,
      (select count(*)::int from field_incidents) as incidents,
      (select count(*)::int from field_conflicts) as conflicts,
      (select count(*)::int from field_radio) as radio,
      (select count(*)::int from field_alerts) as alerts
  `;
  return rows[0] ?? { patrols: 0, incidents: 0, conflicts: 0, radio: 0, alerts: 0 };
}

/** Shared Neon/PGLite rows for hydrating the web desk after phone sync. */
export async function listSharedFieldRecords() {
  const sql = await getSql();
  const [patrols, incidents, conflicts, radio, alerts] = await Promise.all([
    sql<Record<string, unknown>>`
      select patrol_id, route_id, route_name, officer_id, officer_name,
             status, started_at, completed_at, waypoints
      from field_patrols
      order by updated_at desc
      limit 200
    `,
    sql<Record<string, unknown>>`
      select report_id, category, description, lat, lng, location_source,
             observed_at, has_photo, photo_attach_id, photo_sync_state
      from field_incidents
      order by updated_at desc
      limit 200
    `,
    sql<Record<string, unknown>>`
      select report_id, type, location, channel, description, desk_status,
             lat, lng, updated_at
      from field_conflicts
      order by updated_at desc
      limit 200
    `,
    sql<Record<string, unknown>>`
      select message_id, channel, body, sync_state, updated_at
      from field_radio
      order by updated_at desc
      limit 200
    `,
    sql<Record<string, unknown>>`
      select alert_id, animal, collar, zone, observed_at, received_at,
             confidence, status, assignee_id, assignee_name, outcome, resolution_note
      from field_alerts
      order by updated_at desc
      limit 200
    `,
  ]);
  return { patrols, incidents, conflicts, radio, alerts };
}
