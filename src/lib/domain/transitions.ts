import type {
  Alert,
  IncidentReport,
  Patrol,
  ResponseAssignment,
  Waypoint,
} from "./model";
import type { AlertStatus, SyncState } from "./enums";

/**
 * Entity state transitions (A02 R-03/R-04): state rules live with the entity
 * concept, services orchestrate rather than re-implement. All pure functions —
 * trivially unit-testable.
 */

// ---------------------------------------------------------------------------
// Sync state machine: PENDING -> SYNCED | FAILED; FAILED -> PENDING on retry
// ---------------------------------------------------------------------------

export function markSynced<T extends { syncState: SyncState }>(record: T): T {
  return { ...record, syncState: "SYNCED", retryAfter: undefined };
}

export function markPending<T extends { syncState: SyncState }>(record: T): T {
  return { ...record, syncState: "PENDING", retryAfter: undefined };
}

/**
 * FAILED carries a `retryAfter` timestamp (R-05: exponential backoff capped at
 * MAX_BACKOFF_MS). `null` clears the schedule (used when a retry succeeds).
 */
export function markFailed<T extends { syncState: SyncState; retryAfter?: string }>(
  record: T,
  retryAfter: string,
): T {
  return { ...record, syncState: "FAILED", retryAfter };
}

export function isRetryDue(record: { syncState: SyncState; retryAfter?: string }, now: string): boolean {
  if (record.syncState !== "FAILED") return record.syncState === "PENDING";
  return !record.retryAfter || new Date(record.retryAfter).getTime() <= new Date(now).getTime();
}

/** Backoff: attempt 1 → 1 min, 2 → 2, 3 → 4 … capped at 30 minutes. */
export const MAX_BACKOFF_MS = 30 * 60 * 1000;
export function backoffAfter(attempt: number, now: string): string {
  const ms = Math.min(MAX_BACKOFF_MS, Math.pow(2, Math.max(0, attempt - 1)) * 60_000);
  return new Date(new Date(now).getTime() + ms).toISOString();
}

// ---------------------------------------------------------------------------
// Patrol transitions
// ---------------------------------------------------------------------------

export function startPatrol(p: Patrol): Patrol {
  if (p.status !== "ACTIVE") throw new Error("Patrol already finished");
  return p;
}

/** Flush the in-flight waypoint tail before completing (S1/R-05). */
export function completePatrol(p: Patrol, flushTail: Waypoint[], completedAt: string): Patrol {
  if (p.status !== "ACTIVE") throw new Error("Patrol is not active");
  return {
    ...p,
    status: "COMPLETED",
    completedAt,
    syncState: "PENDING",
    waypoints: [...p.waypoints, ...flushTail],
  };
}

// ---------------------------------------------------------------------------
// Incident transitions
// ---------------------------------------------------------------------------

/** Attachment states decouple from the report so partial uploads work (S3). */
export function applyAck(
  incident: IncidentReport,
  complete: boolean,
): IncidentReport {
  const report = markSynced(incident);
  if (complete) {
    return { ...report, attachments: report.attachments.map(markSynced) };
  }
  // Report acked; keep media PENDING so it resumes with the same attachIds.
  return {
    ...report,
    attachments: report.attachments.map((a) =>
      a.syncState === "SYNCED" ? a : markPending(a),
    ),
  };
}

// ---------------------------------------------------------------------------
// Alert / assignment transitions (R-04, R-06)
// ---------------------------------------------------------------------------

/** At most one active assignment per alert: a new assign closes the prior. */
export function closePriorAssignments(assignments: ResponseAssignment[], alertId: string): ResponseAssignment[] {
  return assignments.map((ra) =>
    ra.alertId === alertId && !ra.acknowledgedAt && ra.deliveryState !== "FAILED"
      ? { ...ra, deliveryState: "SENT", acknowledgedAt: undefined, outcome: "superseded" }
      : ra,
  );
}

export function isAlertOpen(a: Alert): boolean {
  return a.status === "OPEN" || a.status === "ESCALATED";
}

export function withStatus(a: Alert, status: AlertStatus): Alert {
  return { ...a, status };
}

/** Notification failed: officer freed, alert back to OPEN (R-06). */
export function releaseAssignment(
  ra: ResponseAssignment,
): ResponseAssignment {
  return { ...ra, deliveryState: "FAILED" };
}
