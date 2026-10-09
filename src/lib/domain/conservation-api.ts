import { createServerFn } from "@tanstack/react-start";

export type PatrolUpsertInput = {
  patrolId: string;
  routeId: string;
  routeName: string;
  officerId: string;
  officerName: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  waypoints: unknown;
};

export type IncidentUpsertInput = {
  reportId: string;
  category: string;
  description: string;
  lat: number;
  lng: number;
  locationSource: string;
  observedAt: string;
  hasPhoto: boolean;
  photoAttachId?: string;
  photoSyncState?: string;
  attachments: unknown;
  complete: boolean;
};

export type ConflictUpsertInput = {
  reportId: string;
  type: string;
  location: string;
  channel: string;
  description: string;
  deskStatus?: string;
  lat?: number;
  lng?: number;
};

export type RadioUpsertInput = {
  messageId: string;
  channel: string;
  body?: string;
};

export type AlertUpsertInput = {
  alertId: string;
  animal: string;
  collar?: string;
  zone: string;
  observedAt: string;
  receivedAt: string;
  confidence: string;
  status: string;
  assigneeId?: string;
  assigneeName?: string;
  outcome?: string;
  resolutionNote?: string;
};

/** Idempotent patrol upsert by patrol_id. */
export const upsertPatrolFn = createServerFn({ method: "POST" })
  .validator((data: PatrolUpsertInput) => data)
  .handler(async ({ data }) => {
    const { upsertPatrolRecord } = await import("./conservation-api.server");
    return upsertPatrolRecord(data);
  });

/** Idempotent incident upsert; `complete` drives photo ack (S3). */
export const upsertIncidentFn = createServerFn({ method: "POST" })
  .validator((data: IncidentUpsertInput) => data)
  .handler(async ({ data }) => {
    const { upsertIncidentRecord } = await import("./conservation-api.server");
    return upsertIncidentRecord(data);
  });

export const upsertConflictFn = createServerFn({ method: "POST" })
  .validator((data: ConflictUpsertInput) => data)
  .handler(async ({ data }) => {
    const { upsertConflictRecord } = await import("./conservation-api.server");
    return upsertConflictRecord(data);
  });

export const upsertRadioFn = createServerFn({ method: "POST" })
  .validator((data: RadioUpsertInput) => data)
  .handler(async ({ data }) => {
    const { upsertRadioRecord } = await import("./conservation-api.server");
    return upsertRadioRecord(data);
  });

export const upsertAlertFn = createServerFn({ method: "POST" })
  .validator((data: AlertUpsertInput) => data)
  .handler(async ({ data }) => {
    const { upsertAlertRecord } = await import("./conservation-api.server");
    return upsertAlertRecord(data);
  });

export const listFieldCountsFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listFieldCounts } = await import("./conservation-api.server");
  return listFieldCounts();
});

export const fieldDbHealthFn = createServerFn({ method: "GET" }).handler(async () => {
  const { dbSource } = await import("@/lib/db");
  const { listFieldCounts } = await import("./conservation-api.server");
  const counts = await listFieldCounts();
  return { source: dbSource, counts };
});

type SharedFieldJsonRow = Record<
  string,
  string | number | boolean | null | undefined
>;

export type SharedFieldRecordsPayload = {
  patrols: SharedFieldJsonRow[];
  incidents: SharedFieldJsonRow[];
  conflicts: SharedFieldJsonRow[];
  radio: SharedFieldJsonRow[];
  alerts: SharedFieldJsonRow[];
};

/** Pull shared field rows so the web desk shows phone-synced Neon data. */
export const listSharedFieldFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<SharedFieldRecordsPayload> => {
    const { listSharedFieldRecords } = await import("./conservation-api.server");
    const raw = await listSharedFieldRecords();
    return JSON.parse(JSON.stringify(raw)) as SharedFieldRecordsPayload;
  },
);
