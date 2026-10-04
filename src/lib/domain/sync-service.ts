import type { ConservationApi, FieldStore } from "./ports";
import type { SyncResult } from "./model";
import { applyAck, backoffAfter } from "./transitions";

/**
 * SyncService (A02 R-05): drains the pending queue record-by-record so the
 * improved UC01/UC02 sequence branches are observable per record:
 *
 *  - full ack (complete=true)          → SYNCED
 *  - report acked, attachments missing → report SYNCED, media PENDING (S3)
 *  - failure                           → FAILED + backoff schedule (S2)
 *  - offline transport                 → caller surfaces user-visible state
 *
 * Records resume with the same stable IDs — upsert idempotency guarantees no
 * duplicates across retries.
 */

export class SyncService {
  constructor(
    private readonly store: FieldStore,
    private readonly api: ConservationApi,
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  async synchronize(): Promise<SyncResult> {
    const now = this.clock();
    const result: SyncResult = {
      patrols: 0,
      incidents: 0,
      partialIncidents: 0,
      failed: 0,
      failures: [],
    };

    for (const rec of this.store.pending(now)) {
      try {
        if (rec.kind === "PATROL") {
          const patrol = this.store.getPatrols().find((p) => p.patrolId === rec.recordId);
          if (!patrol) continue;
          await this.api.upsertPatrol(patrol);
          this.store.markPatrolSynced(patrol.patrolId);
          result.patrols += 1;
        } else {
          const incident = this.store.getIncidents().find((i) => i.reportId === rec.recordId);
          if (!incident) continue;
          const pendingAttachments = incident.attachments.filter((a) => a.syncState === "PENDING");
          const ack = await this.api.upsertIncident(incident, pendingAttachments);
          // applyAck encodes the receipt rule: complete flips report + media,
          // partial flips the report and leaves media PENDING with the same
          // attachIds so the resume sends only un-acked parts (S3/R-05).
          this.store.saveIncident(applyAck(incident, ack.complete));
          result.incidents += 1;
          if (!ack.complete) result.partialIncidents += 1;
        }
      } catch (err) {
        const retryAfter = backoffAfter(1, now);
        if (rec.kind === "PATROL") this.store.markPatrolFailed(rec.recordId, retryAfter);
        else this.store.markIncidentFailed(rec.recordId, retryAfter);
        result.failed += 1;
        result.failures.push({
          recordId: rec.recordId,
          reason: err instanceof Error ? err.message : "upload failed",
        });
      }
    }

    return result;
  }
}
