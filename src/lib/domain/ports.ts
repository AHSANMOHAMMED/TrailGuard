import type {
  IncidentReport,
  Patrol,
  PhotoAttachment,
  SyncAck,
} from "./model";

/**
 * Outbound ports (A02 R-03: stereotyped «gateway»/«repository» layers become
 * interfaces). Services depend on these, never on concrete transports — the
 * seam that makes the domain unit-testable and the UI swappable.
 */

/** Push transport to the conservation server. Fake in tests, fetch in app. */
export interface ConservationApi {
  upsertPatrol(p: Patrol): Promise<SyncAck>;
  upsertIncident(i: IncidentReport, pendingAttachments: PhotoAttachment[]): Promise<SyncAck>;
}

export interface PendingRecord {
  kind: "PATROL" | "INCIDENT";
  recordId: string;
  retryAfter?: string;
}

/** Local persistence + queue the sync engine drains. */
export interface FieldStore {
  getPatrols(): Patrol[];
  savePatrol(p: Patrol): void;
  getIncidents(): IncidentReport[];
  saveIncident(i: IncidentReport): void;
  /** Records needing upload: PENDING, or FAILED whose backoff has elapsed. */
  pending(now: string): PendingRecord[];
  markPatrolSynced(id: string): void;
  /**
   * Incident acks are written via {@link saveIncident} after the pure
   * `applyAck` transition: a complete receipt flips report + attachments,
   * a partial receipt flips the report only (S3/R-05).
   */
  markIncidentFailed(id: string, retryAfter: string): void;
  markPatrolFailed(id: string, retryAfter: string): void;
}
