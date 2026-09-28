import type { IncidentReport, Patrol } from "./model";

/**
 * Idempotent upsert (case-study contract; A01 promised it, A02 makes it a
 * typed, testable unit). Same stable UUID twice ⇒ one record; a re-upsert
 * updates fields and appends only unseen waypoints/attachments (retry-safety).
 */

export function upsertPatrol(existing: Patrol[], incoming: Patrol): { list: Patrol[]; created: boolean } {
  const idx = existing.findIndex((p) => p.patrolId === incoming.patrolId);
  if (idx === -1) {
    return { list: [incoming, ...existing], created: true };
  }
  const prev = existing[idx];
  const seen = new Set(prev.waypoints.map((w) => w.pointId));
  const merged: Patrol = {
    ...prev,
    status: incoming.status,
    completedAt: incoming.completedAt ?? prev.completedAt,
    syncState: "SYNCED",
    waypoints: [...prev.waypoints, ...incoming.waypoints.filter((w) => !seen.has(w.pointId))],
  };
  const list = existing.map((p, i) => (i === idx ? merged : p));
  return { list, created: false };
}

export function upsertIncident(
  existing: IncidentReport[],
  incoming: IncidentReport,
): { list: IncidentReport[]; created: boolean } {
  const idx = existing.findIndex((i) => i.reportId === incoming.reportId);
  if (idx === -1) {
    return { list: [incoming, ...existing], created: true };
  }
  const prev = existing[idx];
  const seen = new Set(prev.attachments.map((a) => a.attachId));
  const merged: IncidentReport = {
    ...prev,
    category: incoming.category,
    description: incoming.description,
    syncState: "SYNCED",
    attachments: [...prev.attachments, ...incoming.attachments.filter((a) => !seen.has(a.attachId))],
  };
  const list = existing.map((i) => (i.reportId === incoming.reportId ? merged : i));
  return { list, created: false };
}
