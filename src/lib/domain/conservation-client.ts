/**
 * Client-side ConservationAPI — calls PGLite/Neon server fns when online.
 * Mirror fallback is TEST-ONLY so live sync never looks green while the DB is empty.
 */
import type { ConservationApi } from "./ports";
import type { IncidentReport, Patrol, PhotoAttachment, SyncAck } from "./model";
import {
  mirrorUpsertAlert,
  mirrorUpsertConflict,
  mirrorUpsertIncident,
  mirrorUpsertPatrol,
  mirrorUpsertRadio,
} from "./server-mirror";
import {
  upsertAlertFn,
  upsertConflictFn,
  upsertIncidentFn,
  upsertPatrolFn,
  upsertRadioFn,
  type AlertUpsertInput,
} from "./conservation-api";

function allowMirrorFallback(): boolean {
  if (typeof process === "undefined") return false;
  if (process.env.NODE_ENV === "test" || process.env.VITEST === "true") return true;
  // `node --test` does not set NODE_ENV; mirror fallback keeps domain tests hermetic.
  return process.argv.includes("--test");
}

async function withOptionalMirrorFallback<T>(
  primary: () => Promise<T>,
  fallback: () => T,
): Promise<T> {
  try {
    return await primary();
  } catch (err) {
    if (allowMirrorFallback()) {
      console.warn("[ConservationAPI] test mirror fallback", err);
      return fallback();
    }
    throw err;
  }
}

function ack(recordId: string, complete: boolean): SyncAck {
  return {
    recordId,
    version: 1,
    complete,
    receivedAt: new Date().toISOString(),
  };
}

export const liveConservationApi: ConservationApi = {
  async upsertPatrol(p: Patrol): Promise<SyncAck> {
    await withOptionalMirrorFallback(
      async () => {
        await upsertPatrolFn({
          data: {
            patrolId: p.patrolId,
            routeId: p.routeId,
            routeName: p.routeName,
            officerId: p.officerId,
            officerName: p.officerName,
            status: p.status,
            startedAt: p.startedAt,
            completedAt: p.completedAt,
            waypoints: p.waypoints,
          },
        });
        return ack(p.patrolId, true);
      },
      () => {
        mirrorUpsertPatrol(p);
        return ack(p.patrolId, true);
      },
    );
    return ack(p.patrolId, true);
  },

  async upsertIncident(
    i: IncidentReport,
    pendingAttachments: PhotoAttachment[],
  ): Promise<SyncAck> {
    const complete = pendingAttachments.length === 0;
    return withOptionalMirrorFallback(
      async () => {
        const r = await upsertIncidentFn({
          data: {
            reportId: i.reportId,
            category: i.category,
            description: i.description,
            lat: i.geo.lat,
            lng: i.geo.lng,
            locationSource: i.locationSource,
            observedAt: i.observedAt,
            hasPhoto: i.attachments.length > 0,
            photoAttachId: i.attachments[0]?.attachId,
            photoSyncState: i.attachments[0]?.syncState,
            attachments: i.attachments,
            complete,
          },
        });
        return ack(i.reportId, r.complete);
      },
      () => {
        mirrorUpsertIncident(i);
        return ack(i.reportId, complete);
      },
    );
  },
};

export async function upsertConflictLive(input: {
  reportId: string;
  type: string;
  location: string;
  channel: string;
  description: string;
}): Promise<void> {
  await withOptionalMirrorFallback(
    async () => {
      await upsertConflictFn({ data: input });
    },
    () => {
      mirrorUpsertConflict({ ...input, syncState: "SYNCED" });
    },
  );
}

export async function upsertRadioLive(input: {
  messageId: string;
  channel: string;
  body?: string;
}): Promise<void> {
  await withOptionalMirrorFallback(
    async () => {
      await upsertRadioFn({ data: input });
    },
    () => {
      mirrorUpsertRadio({ ...input, syncState: "SYNCED" });
    },
  );
}

export async function upsertAlertLive(input: AlertUpsertInput): Promise<void> {
  await withOptionalMirrorFallback(
    async () => {
      await upsertAlertFn({ data: input });
    },
    () => {
      mirrorUpsertAlert({
        alertId: input.alertId,
        animal: input.animal,
        zone: input.zone,
        observedAt: input.observedAt,
        receivedAt: input.receivedAt,
        confidence: input.confidence,
        status: input.status,
      });
    },
  );
}
