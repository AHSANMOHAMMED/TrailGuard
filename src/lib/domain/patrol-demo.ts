/**
 * UC01 demo helpers (Sureka) — labels and pacing used by the patrol UI so
 * the viva walk stays deterministic without inventing coverage numbers.
 */

/** Demo GPS tick count that reaches ~full route coverage in a short viva. */
export const DEMO_COVER_POSITIONS = 24;

/** Commit a real GPS waypoint every N simulated device positions. */
export const DEMO_GPS_EVERY = 2;

/** Human label for a waypoint ordinal (WP-01 …). */
export function waypointLabel(index1Based: number): string {
  const n = Math.max(1, Math.floor(index1Based));
  return `WP-${String(n).padStart(2, "0")}`;
}

/** Short coverage chip for the patrol header. */
export function coverageChip(pct: number): string {
  if (!Number.isFinite(pct) || pct <= 0) return "0% covered";
  if (pct >= 95) return "Route covered";
  return `${Math.round(pct)}% covered`;
}

/** Queue depth summary for the UC01b badge. */
export function queueBadgeLabel(depth: number, failed: number): string {
  if (depth <= 0) return "Sync queue clear — all records acknowledged";
  if (failed > 0) return `${depth} queued · ${failed} failed`;
  return `${depth} pending synchronisation`;
}

/** Elapsed patrol duration for the completion summary. */
export function formatPatrolDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m <= 0) return `${r} s`;
  return `${m} m ${String(r).padStart(2, "0")} s`;
}

/** Progress fraction clamped to [0,1] for the route sketch. */
export function demoProgress(positions: number, coverAt = DEMO_COVER_POSITIONS): number {
  if (coverAt <= 0) return 0;
  return Math.max(0, Math.min(1, positions / coverAt));
}
