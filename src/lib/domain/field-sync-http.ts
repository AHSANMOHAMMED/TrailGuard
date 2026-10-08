/**
 * Mobile ↔ shared Field Sync HTTP adapter.
 * Phones POST snake_case payloads to /api/v1/sync/upsert; we map into
 * ConservationAPI records that land in the single shared Postgres (Neon/PGLite).
 */
import {
  upsertAlertRecord,
  upsertConflictRecord,
  upsertIncidentRecord,
  upsertPatrolRecord,
  upsertRadioRecord,
  listFieldCounts,
} from "./conservation-api.server";

export type MobileSyncKind = "patrol" | "incident" | "conflict" | "radio" | "alert";

export type SyncAck = {
  id: string;
  version: number;
  complete: boolean;
};

function asRecord(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return {};
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function geoOf(payload: Record<string, unknown>): { lat: number; lng: number } {
  const geo = asRecord(payload.geo);
  return { lat: num(geo.lat), lng: num(geo.lng) };
}

/** CORS + JSON helpers for native phone clients and local web debugging. */
export function corsHeaders(origin?: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin?.trim() || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export function jsonResponse(
  body: unknown,
  init: { status?: number; origin?: string | null } = {},
): Response {
  return Response.json(body, {
    status: init.status ?? 200,
    headers: corsHeaders(init.origin),
  });
}

export async function handleMobileUpsert(
  kind: string,
  payload: unknown,
): Promise<SyncAck> {
  const p = asRecord(payload);

  if (kind === "patrol") {
    const patrolId = str(p.patrol_id || p.patrolId);
    if (!patrolId) throw new Error("patrol_id required");
    const routeId = str(p.route_id || p.routeId, "unknown-route");
    const officerId = str(p.officer_id || p.officerId, "unknown-officer");
    await upsertPatrolRecord({
      patrolId,
      routeId,
      routeName: str(p.route_name || p.routeName, routeId),
      officerId,
      officerName: str(p.officer_name || p.officerName, officerId),
      status: str(p.status, "COMPLETED"),
      startedAt: str(p.started_at || p.startedAt, new Date().toISOString()),
      completedAt: str(p.completed_at || p.completedAt) || undefined,
      waypoints: p.waypoints ?? [],
    });
    return { id: patrolId, version: 1, complete: true };
  }

  if (kind === "incident") {
    const reportId = str(p.report_id || p.reportId);
    if (!reportId) throw new Error("report_id required");
    const { lat, lng } = geoOf(p);
    const attachments = Array.isArray(p.attachments) ? p.attachments : [];
    const hasPhoto = attachments.length > 0 || Boolean(p.has_photo || p.hasPhoto);
    const complete =
      typeof p.complete === "boolean"
        ? p.complete
        : attachments.every((a) => {
            const row = asRecord(a);
            return Boolean(str(row.uri || row.url));
          });
    const result = await upsertIncidentRecord({
      reportId,
      category: str(p.type || p.category, "UNKNOWN"),
      description: str(p.description),
      lat: num(p.lat, lat),
      lng: num(p.lng, lng),
      locationSource: str(p.location_source || p.locationSource, "GPS"),
      observedAt: str(p.observed_at || p.observedAt, new Date().toISOString()),
      hasPhoto,
      photoAttachId: str(
        p.photo_attach_id ||
          p.photoAttachId ||
          asRecord(attachments[0]).attach_id ||
          asRecord(attachments[0]).attachId,
      ) || undefined,
      photoSyncState: str(p.photo_sync_state || p.photoSyncState) || undefined,
      attachments,
      complete,
    });
    return { id: reportId, version: 1, complete: result.complete };
  }

  if (kind === "conflict") {
    const reportId = str(p.conflict_id || p.report_id || p.reportId || p.conflictId);
    if (!reportId) throw new Error("conflict_id required");
    const { lat, lng } = geoOf(p);
    const species = str(p.species || p.type, "conflict");
    const risk = str(p.risk_level || p.riskLevel);
    const notes = str(p.notes || p.description);
    await upsertConflictRecord({
      reportId,
      type: risk ? `${species}:${risk}` : species,
      location: str(p.location || p.park_id || p.parkId, "field"),
      channel: str(p.channel, "MOBILE"),
      description: notes || species,
      deskStatus: str(p.desk_status || p.deskStatus) || undefined,
      lat: num(p.lat, lat) || undefined,
      lng: num(p.lng, lng) || undefined,
    });
    return { id: reportId, version: 1, complete: true };
  }

  if (kind === "radio") {
    const messageId = str(p.message_id || p.messageId);
    if (!messageId) throw new Error("message_id required");
    await upsertRadioRecord({
      messageId,
      channel: str(p.channel, "OPS"),
      body: str(p.body) || undefined,
    });
    return { id: messageId, version: 1, complete: true };
  }

  if (kind === "alert") {
    const alertId = str(p.alert_id || p.alertId);
    if (!alertId) throw new Error("alert_id required");
    await upsertAlertRecord({
      alertId,
      animal: str(p.animal || p.species, "unknown"),
      collar: str(p.collar) || undefined,
      zone: str(p.zone || p.zone_id || p.zoneId, "unknown"),
      observedAt: str(p.observed_at || p.observedAt, new Date().toISOString()),
      receivedAt: str(p.received_at || p.receivedAt, new Date().toISOString()),
      confidence: str(p.confidence, "High"),
      status: str(p.status, "OPEN"),
      assigneeId: str(p.assignee_id || p.assigneeId) || undefined,
      assigneeName: str(p.assignee_name || p.assigneeName) || undefined,
      outcome: str(p.outcome) || undefined,
      resolutionNote: str(p.resolution_note || p.resolutionNote) || undefined,
    });
    return { id: alertId, version: 1, complete: true };
  }

  throw new Error(`Unknown kind: ${kind}`);
}

export async function fieldHealthPayload() {
  const { dbSource } = await import("@/lib/db");
  const counts = await listFieldCounts();
  return {
    app: "TrailGuard",
    status: "ok",
    shared: true,
    source: dbSource,
    counts,
  };
}
