/**
 * Per-record sync state transforms (R-05 isolation).
 * Store actions call these; ConservationAPI lives in conservation-client.
 */
import { backoffAfter } from "@/lib/domain/transitions";
import type { ConflictReport, Incident, Patrol } from "@/lib/types";
import type { QueueKind } from "@/lib/domain/patrol-ops";

export interface SyncTriple {
  patrols: Patrol[];
  incidents: Incident[];
  conflicts: ConflictReport[];
}

export function syncAttemptsOf(s: SyncTriple, kind: QueueKind, recordId: string): number {
  if (kind === "PATROL") return s.patrols.find((p) => p.patrolId === recordId)?.syncAttempts ?? 0;
  if (kind === "INCIDENT") return s.incidents.find((i) => i.reportId === recordId)?.syncAttempts ?? 0;
  return s.conflicts.find((c) => c.reportId === recordId)?.syncAttempts ?? 0;
}

/** Server ack: PENDING/FAILED → SYNCED, schedule cleared (idempotent upsert). */
export function applySynced(s: SyncTriple, kind: QueueKind, recordId: string): Partial<SyncTriple> {
  const ok = <T extends { retryAfter?: string; failureReason?: string }>(r: T) => ({
    ...r,
    retryAfter: undefined,
    failureReason: undefined,
  });
  if (kind === "PATROL") {
    return {
      patrols: s.patrols.map((p) =>
        p.patrolId === recordId ? { ...ok(p), syncState: "SYNCED" as const } : p,
      ),
    };
  }
  if (kind === "INCIDENT") {
    return {
      incidents: s.incidents.map((i) =>
        i.reportId === recordId
          ? {
              ...ok(i),
              syncState: "SYNCED" as const,
              photoSyncState: i.hasPhoto ? ("SYNCED" as const) : i.photoSyncState,
            }
          : i,
      ),
    };
  }
  return {
    conflicts: s.conflicts.map((c) =>
      c.reportId === recordId ? { ...ok(c), syncState: "SYNCED" as const } : c,
    ),
  };
}

/** 5b (S2/R-05): transport failure → FAILED, backoff doubles per attempt. */
export function applyFailed(
  s: SyncTriple,
  kind: QueueKind,
  recordId: string,
  reason: string,
  attempt: number,
): Partial<SyncTriple> {
  const retryAfter = backoffAfter(attempt, new Date().toISOString());
  const bad = <T>(r: T) => ({
    ...r,
    syncState: "FAILED" as const,
    retryAfter,
    syncAttempts: attempt,
    failureReason: reason,
  });
  if (kind === "PATROL") {
    return { patrols: s.patrols.map((p) => (p.patrolId === recordId ? bad(p) : p)) };
  }
  if (kind === "INCIDENT") {
    return { incidents: s.incidents.map((i) => (i.reportId === recordId ? bad(i) : i)) };
  }
  return { conflicts: s.conflicts.map((c) => (c.reportId === recordId ? bad(c) : c)) };
}
