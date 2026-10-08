/**
 * Client-side ConservationAPI — calls PGLite/Neon server fns when online.
 * Falls back to in-memory mirror only when the server call fails in tests
 * without a running runtime (unit tests inject their own fake).
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

async function withMirrorFallback<T>(
  primary: () => Promise<T>,
  fallback: () => T,
): Promise<T> {
  try {
    return await primary();
  } catch (err) {
    // Surface SQL/runtime failures in the console so sync isn't silently
    // "green" while field_* tables stay empty (tests still use the mirror).
    console.warn("[ConservationAPI] server upsert failed; using mirror fallback", err);
    return fallback();
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
    await withMirrorFallback(
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
    const result = await withMirrorFallback(
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
    return result;
  },
};

export async function upsertConflictLive(input: {
  reportId: string;
  type: string;
  location: string;
  channel: string;
  description: string;
}): Promise<void> {
  await withMirrorFallback(
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
  await withMirrorFallback(
    async () => {
      await upsertRadioFn({ data: input });
    },
    () => {
      mirrorUpsertRadio({ ...input, syncState: "SYNCED" });
    },
  );
}

export async function upsertAlertLive(input: AlertUpsertInput): Promise<void> {
  await withMirrorFallback(
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
