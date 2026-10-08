import type {
  Alert,
  ConservationReport,
  IncidentReport,
  Patrol,
  ReportCriteria,
} from "./model";
import { trackLengthKm } from "./geo";

/**
 * Report aggregation (A02 R-07). Fixes A01's undefined coverage metric:
 *
 *   coverage% = Σ covered km of synced completed patrols
 *               ÷ Σ assigned-route distance (km) for the window, capped at 100.
 *
 * Covered km is the patrol's waypoint track length, never exceeding its
 * route's length. Route metadata comes from ROUTE_INDEX.
 */

/** Window cap: queries stay bounded on field hardware (S5/R-07). */
export const MAX_WINDOW_DAYS = 92;

export interface ValidatedCriteria {
  park: string;
  from: string;
  to: string;
}

export function validateCriteria(
  c: ReportCriteria,
): { ok: true; value: ValidatedCriteria } | { ok: false; error: string } {
  const from = new Date(`${c.from}T00:00:00Z`);
  const to = new Date(`${c.to}T23:59:59Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { ok: false, error: "Invalid date range" };
  }
  if (to < from) {
    return { ok: false, error: "From date must be on or before To date" };
  }
  const days = (to.getTime() - from.getTime()) / 86_400_000;
  if (days > MAX_WINDOW_DAYS) {
    return { ok: false, error: `Choose a window up to ${MAX_WINDOW_DAYS} days` };
  }
  return { ok: true, value: { park: c.park, from: c.from, to: c.to } };
}

export interface RouteMeta {
  routeId: string;
  name: string;
  distanceKm: number;
}

export const ROUTE_INDEX: Record<string, RouteMeta> = {
  "RT-07": { routeId: "RT-07", name: "North Ridge Corridor", distanceKm: 12.4 },
  "RT-03": { routeId: "RT-03", name: "Eastern Loop", distanceKm: 8.2 },
  /** Wireframe demo route used by the live field store (UC01). */
  "NB-03": { routeId: "NB-03", name: "North Boundary Patrol", distanceKm: 7.4 },
};

/**
 * Aggregate one immutable snapshot from SYNCED records only. Pure — takes a
 * `now` timestamp so the cutoff is deterministic under test. An empty window
 * produces the explicit zero-state report (S5/R-07): counts are 0, coverage
 * is 0, and the cutoff is still recorded.
 */
export function generateSnapshot(
  criteria: ValidatedCriteria,
  data: { patrols: Patrol[]; incidents: IncidentReport[]; alerts: Alert[] },
  now: string,
): ConservationReport {
  const fromD = new Date(`${criteria.from}T00:00:00Z`).getTime();
  const toD = new Date(`${criteria.to}T23:59:59Z`).getTime();

  const syncedPatrols = data.patrols.filter((p) => {
    const t = new Date(p.startedAt).getTime();
    return p.syncState === "SYNCED" && p.status === "COMPLETED" && t >= fromD && t <= toD;
  });

  const syncedIncidents = data.incidents.filter((i) => {
    const t = new Date(i.observedAt).getTime();
    return i.syncState === "SYNCED" && t >= fromD && t <= toD;
  });

  const byCategory: Record<string, number> = {};
  for (const i of syncedIncidents) {
    byCategory[i.category] = (byCategory[i.category] ?? 0) + 1;
  }

  // Coverage: covered track length over assigned route length for the window.
  const routeKm = syncedPatrols.reduce(
    (sum, p) => sum + (ROUTE_INDEX[p.routeId]?.distanceKm ?? 0),
    0,
  );
  const coveredKm = syncedPatrols.reduce((sum, p) => {
    const routeLimit = ROUTE_INDEX[p.routeId]?.distanceKm ?? Number.POSITIVE_INFINITY;
    return sum + Math.min(trackLengthKm(p.waypoints.map((w) => w.geo)), routeLimit);
  }, 0);
  const coveragePercent =
    routeKm === 0 ? 0 : Math.min(100, Math.round((coveredKm / routeKm) * 100));

  return {
    reportId: `rep-${criteria.from}-${criteria.to}`,
    park: criteria.park,
    from: criteria.from,
    to: criteria.to,
    cutoff: now,
    generatedAt: now,
    incidentCount: syncedIncidents.length,
    patrolCount: syncedPatrols.length,
    coveragePercent,
    conflictCount: data.alerts.length,
    byCategory,
  };
}
