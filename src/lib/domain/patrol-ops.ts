import { trackLengthKm } from "./geo";

/**
 * UC01 operations (A02): R-07 coverage formula, R-10 manual-mark undo (3b),
 * S1/R-05 in-flight flush, and the UC01b retry-queue view. Pure and
 * framework-free so the field store and routes stay thin (project rule).
 */

/**
 * Minimal structural waypoint shape — satisfied by the web store's flat
 * `Waypoint` (and any record carrying an id + position).
 */
export interface TrackedPoint {
  pointId: string;
  lat: number;
  lng: number;
}

/**
 * R-07 coverage: covered track km ÷ assigned route km, capped at 100.
 * A route-less (or zero-length) route yields 0% — never NaN.
 */
export function coveragePercent(trackKm: number, routeKm: number): number {
  if (!Number.isFinite(trackKm) || !Number.isFinite(routeKm) || routeKm <= 0) return 0;
  const pct = (trackKm / routeKm) * 100;
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  return Math.min(100, Math.round(pct));
}

/** Track length of the recorded waypoints, in km (haversine polyline). */
export function patrolTrackKm(points: Array<{ lat: number; lng: number }>): number {
  return trackLengthKm(points);
}

/** The route counts as covered once coverage reaches the gate (default 95%). */
export function isRouteCovered(coveragePct: number, gatePct = 95): boolean {
  return coveragePct >= gatePct;
}

/**
 * 3b (R-10): a manual mark made in error is undone — the last waypoint is
 * removed and nothing else changes. Undoing an empty list is a no-op.
 */
export function undoLastWaypoint<T extends TrackedPoint>(points: T[]): {
  points: T[];
  removed: T | null;
} {
  if (points.length === 0) return { points, removed: null };
  return { points: points.slice(0, -1), removed: points[points.length - 1] };
}

/**
 * S1/R-05: flush the in-flight waypoint tail before completing. Dedup by
 * stable pointId so a retried flush never creates orphan duplicates (same
 * rule as the backend idempotent upsert).
 */
export function flushWaypointTail<T extends TrackedPoint>(existing: T[], tail: T[]): T[] {
  const seen = new Set(existing.map((w) => w.pointId));
  const fresh = tail.filter((w) => !seen.has(w.pointId));
  return [...existing, ...fresh];
}

// ---------------------------------------------------------------------------
// UC01b — Retry Failed Sync (R-02a): the pending queue is visible at all
// times, with per-record failure reasons and a retry schedule.
// ---------------------------------------------------------------------------

export type QueueKind = "PATROL" | "INCIDENT" | "CONFLICT";

export interface QueueRecord {
  kind: QueueKind;
  recordId: string;
  label: string;
  sublabel?: string;
  syncState: "PENDING" | "FAILED";
  syncAttempts: number;
  retryAfter?: string; // ISO — only while FAILED
  failureReason?: string;
}

export type QueueItem = QueueRecord & {
  /** FAILED and its backoff has elapsed — eligible for automatic retry. */
  retryDue: boolean;
  /** FAILED and still within its backoff window — "held, retrying automatically". */
  holding: boolean;
};

/** Build the visible queue: PENDING records plus FAILED records on schedule. */
export function buildQueue(records: QueueRecord[], now: string): QueueItem[] {
  return records.map((r) => {
    const retryDue =
      r.syncState === "PENDING" ||
      (!r.retryAfter || new Date(r.retryAfter).getTime() <= new Date(now).getTime());
    return { ...r, retryDue, holding: r.syncState === "FAILED" && !retryDue };
  });
}

/** Queue depth for the always-visible badge (T1/H4): pending + failed. */
export function queueDepth(items: QueueItem[]): number {
  return items.length;
}

/** Human label for the next automatic retry, e.g. "in 4 m". */
export function nextAutoRetryLabel(retryAfter: string, now: string): string {
  const ms = new Date(retryAfter).getTime() - new Date(now).getTime();
  if (ms <= 0) return "now";
  const totalS = Math.ceil(ms / 1000);
  if (totalS < 60) return `in ${totalS}s`;
  const m = Math.floor(totalS / 60);
  const s = totalS % 60;
  return s > 0 ? `in ${m} m ${String(s).padStart(2, "0")} s` : `in ${m} m`;
}
