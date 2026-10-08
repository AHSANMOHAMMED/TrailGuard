import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Alert,
  ConflictReport,
  Incident,
  Patrol,
  RadioMessage,
  ReportSnapshot,
  Waypoint,
} from "@/lib/types";
import { uid } from "@/lib/utils";
import { seedChatter } from "@/lib/radio-chatter";
import { backoffAfter } from "@/lib/domain/transitions";
import {
  buildQueue,
  flushWaypointTail,
  undoLastWaypoint as undoLast,
  type QueueItem,
  type QueueKind,
  type QueueRecord,
} from "@/lib/domain/patrol-ops";
import {
  generateSnapshot,
  validateCriteria,
} from "@/lib/domain/reporting";
import type {
  Alert as DomainAlert,
  IncidentReport,
  Patrol as DomainPatrol,
} from "@/lib/domain/model";
import type { IncidentCategory } from "@/lib/domain/enums";
import {
  mirrorUpsertConflict,
  mirrorUpsertIncident,
  mirrorUpsertPatrol,
  mirrorUpsertRadio,
} from "@/lib/domain/server-mirror";

/** Assigned route exactly as on the UC01 hi-fi wireframe. */
const ROUTE = {
  id: "NB-03",
  name: "North Boundary Patrol",
  sector: "Northern park boundary",
  distanceKm: 7.4,
  estTime: "3 h",
  gainM: 120,
  assignedAt: "06:30 today",
  details: "Northern park boundary, 7.4 km loop. Return to NB gate on completion.",
  /** Simulated GPS trace anchors — the demo device moves along this line. */
  start: { lat: 6.401, lng: 81.118 },
  end: { lat: 6.466, lng: 81.142 },
};

/** Interpolated position along the route for `t` in [0,1] (demo GPS trace). */
export function routePointAt(t: number): { lat: number; lng: number } {
  const c = Math.max(0, Math.min(1, t));
  return {
    lat: ROUTE.start.lat + (ROUTE.end.lat - ROUTE.start.lat) * c,
    lng: ROUTE.start.lng + (ROUTE.end.lng - ROUTE.start.lng) * c,
  };
}

function seedSynced(): { patrols: Patrol[]; incidents: Incident[] } {
  const t0 = new Date("2026-08-12T06:10:00Z").toISOString();
  const t1 = new Date("2026-08-12T10:40:00Z").toISOString();
  return {
    patrols: [
      {
        patrolId: "pt-seed-01",
        routeId: ROUTE.id,
        routeName: ROUTE.name,
        officerId: "off-mercer",
        officerName: "RN-402 Mercer",
        status: "COMPLETED",
        startedAt: t0,
        completedAt: t1,
        syncState: "SYNCED",
        waypoints: [
          {
            pointId: "wp-s1",
            lat: 6.401,
            lng: 81.118,
            source: "GPS",
            recordedAt: t0,
            label: "WP-01",
          },
          {
            pointId: "wp-s2",
            lat: 6.412,
            lng: 81.126,
            source: "GPS",
            recordedAt: t1,
            label: "WP-08",
          },
        ],
      },
    ],
    incidents: [
      {
        reportId: "ir-seed-01",
        type: "Snare",
        description: "Wire snare recovered near dry creek",
        lat: 6.408,
        lng: 81.121,
        locationSource: "GPS",
        observedAt: "2026-08-14T09:20:00Z",
        syncState: "SYNCED",
        hasPhoto: true,
      },
      {
        reportId: "ir-seed-02",
        type: "Crop-raid",
        description: "Elephant damage, eastern farms",
        lat: 6.39,
        lng: 81.14,
        locationSource: "MANUAL",
        observedAt: "2026-08-20T18:05:00Z",
        syncState: "SYNCED",
        hasPhoto: false,
      },
    ],
  };
}

const seeded = seedSynced();

/** VHF channel plan — ids are stable and referenced by radio messages. */
export const RADIO_CHANNELS = [
  { id: "OPS-1", name: "Operations", freq: "140.2000 MHz", desc: "Patrol coordination" },
  { id: "EMG-7", name: "Emergency", freq: "141.3000 MHz", desc: "Risk response · rescue" },
  { id: "CMN-3", name: "Community", freq: "142.8000 MHz", desc: "Liaison ↔ village hotline" },
] as const;

export type RadioChannelId = (typeof RADIO_CHANNELS)[number]["id"];

const TYPE_TO_CATEGORY: Record<string, IncidentCategory> = {
  Snare: "SNARE",
  "Crop-raid": "CROP_RAID",
  "Poaching sign": "POACHING_SIGN",
  "Injured animal": "INJURED_ANIMAL",
};

function toDomainPatrol(p: Patrol): DomainPatrol {
  return {
    patrolId: p.patrolId,
    routeId: p.routeId,
    routeName: p.routeName,
    officerId: p.officerId,
    officerName: p.officerName,
    status: p.status,
    startedAt: p.startedAt,
    completedAt: p.completedAt,
    syncState: p.syncState,
    retryAfter: p.retryAfter,
    waypoints: p.waypoints.map((w) => ({
      pointId: w.pointId,
      geo: { lat: w.lat, lng: w.lng },
      source: w.source,
      recordedAt: w.recordedAt,
      label: w.label,
    })),
  };
}

function toDomainIncident(i: Incident): IncidentReport {
  const photoState = i.photoSyncState ?? i.syncState;
  return {
    reportId: i.reportId,
    category: TYPE_TO_CATEGORY[i.type] ?? "OTHER",
    description: i.description,
    geo: { lat: i.lat, lng: i.lng },
    locationSource: i.locationSource,
    observedAt: i.observedAt,
    syncState: i.syncState,
    retryAfter: i.retryAfter,
    attachments: i.hasPhoto
      ? [
          {
            attachId: i.photoAttachId ?? `${i.reportId}-photo`,
            uri: "local://photo",
            mimeType: "image/jpeg",
            syncState: photoState,
          },
        ]
      : [],
  };
}

function toDomainAlert(a: Alert): DomainAlert {
  const status =
    a.status === "OPEN" || a.status === "REVIEW"
      ? "OPEN"
      : a.status === "ASSIGNED"
        ? "ASSIGNED"
        : a.status === "ESCALATED"
          ? "ESCALATED"
          : "CLOSED";
  return {
    alertId: a.alertId,
    animal: a.animal,
    zoneId: a.zone,
    zoneName: a.zone,
    confidence: a.confidence === "High" ? "HIGH" : a.confidence === "Medium" ? "MEDIUM" : "LOW",
    status,
    observedAt: a.observedAt,
    receivedAt: a.receivedAt,
  };
}

interface FieldState {
  online: boolean;
  syncing: boolean;
  lastSyncAt: string | null;
  /** When true, simulated transmissions from other units arrive on channel. */
  feedOn: boolean;
  patrols: Patrol[];
  incidents: Incident[];
  alerts: Alert[];
  conflicts: ConflictReport[];
  radioMessages: RadioMessage[];
  snapshot: ReportSnapshot | null;
  setOnline: (v: boolean) => void;
  startPatrol: () => Patrol;
  addWaypoint: (source: "GPS" | "MANUAL", geo?: { lat: number; lng: number }) => Waypoint | null;
  /** UC01 3b (R-10) — remove a mark made in error (defaults to the last). */
  undoLastWaypoint: (pointId?: string) => Waypoint | null;
  /** UC01 S1/R-05 — flush the in-flight waypoint tail before completing. */
  finishPatrol: (summary?: {
    positions?: number;
    coveragePct?: number;
    flushTail?: Waypoint[];
  }) => Patrol | null;
  createIncident: (input: {
    type: string;
    description: string;
    locationSource: "GPS" | "MANUAL";
    hasPhoto: boolean;
    /** Demo S3/R-05: ack the report but leave the photo PENDING. */
    partialPhoto?: boolean;
  }) => Incident;
  /** UC03 — ranger acknowledges a risk alert (NEW → ACKNOWLEDGED). */
  ackAlert: (alertId: string) => void;
  /** UC03 — close the alert with an outcome (ACKNOWLEDGED → RESOLVED). */
  resolveAlert: (alertId: string, outcome: string, note?: string) => void;
  /** UC03 — re-raise the demo alert so the flow can be run again. */
  resetAlert: (opts?: { confidence?: Alert["confidence"]; status?: Alert["status"] }) => void;
  /** UC03 R-04 — manager assigns one available officer (closes prior active). */
  assignAlert: (alertId: string, officer: { id: string; name: string }) => void;
  /** UC03 R-06 — notification FAILED → restore availability, alert OPEN, bump attempts. */
  failNotify: (alertId: string) => "OPEN" | "ESCALATED";
  /** UC03 R-02b — escalate to backup after ladder exhausts. */
  escalateAlert: (alertId: string) => void;
  /** UC03 R-08 — hold low-confidence alerts in REVIEW (no paging). */
  holdForTriage: (alertId: string) => void;
  /** UC04 — community member submits a human-wildlife conflict report. */
  createConflict: (input: {
    type: string;
    location: string;
    channel: "Mobile App" | "SMS";
    description: string;
  }) => ConflictReport;
  /** UC04 — staff records the response (SUBMITTED → RESPONDED). */
  respondConflict: (reportId: string) => void;
  markConflictSynced: (reportId: string) => void;
  /** Field radio — record a push-to-talk or text transmission (UC-radio). */
  transmitRadio: (input: {
    channel: RadioChannelId;
    fromRole: RadioMessage["fromRole"];
    fromTitle: string;
    kind: "voice" | "text";
    text?: string;
    durationS?: number;
  }) => RadioMessage;
  /** Field radio — an incoming transmission heard on channel (network feed). */
  receiveRadio: (input: {
    channel: RadioChannelId;
    fromRole: RadioMessage["fromRole"];
    fromTitle: string;
    text: string;
  }) => void;
  /** Field radio — pause/resume the simulated unit-to-unit network feed. */
  setFeedOn: (v: boolean) => void;
  /** Field radio — backfill channel history on first open. */
  seedRadioLog: (channel: RadioChannelId) => void;
  generateReport: (from: string, to: string) => ReportSnapshot;
  synchronize: () => Promise<{ patrols: number; incidents: number; radio: number }>;
  activePatrol: () => Patrol | undefined;
  pendingCount: () => number;
  /** UC01b (R-02a) — the visible retry queue: pending + failed records. */
  queueItems: () => QueueItem[];
  /** Sync one record now; a dropped transport marks it FAILED with backoff (5b). */
  syncOne: (kind: QueueKind, recordId: string) => Promise<"SYNCED" | "FAILED">;
  /** UC01b — retry now, bypassing the backoff schedule. */
  retryRecord: (kind: QueueKind, recordId: string) => Promise<"SYNCED" | "FAILED">;
}

export const useField = create<FieldState>()(
  persist(
    (set, get) => ({
      online: true,
      syncing: false,
      lastSyncAt: "2026-08-31T06:12:00Z",
      feedOn: true,
      patrols: seeded.patrols,
      incidents: seeded.incidents,
      snapshot: null,
      alerts: [
        {
          alertId: "AL-19",
          animal: "Elephant",
          collar: "EL-07",
          zone: "Farmland",
          observedAt: "2026-09-24T06:52:00Z",
          receivedAt: "2026-09-24T06:52:00Z",
          confidence: "High",
          status: "OPEN",
        },
      ],
      conflicts: [],
      radioMessages: [],
      setOnline: (v) => set({ online: v }),
      activePatrol: () => get().patrols.find((p) => p.status === "ACTIVE"),
      pendingCount: () => {
        const s = get();
        const patrols = s.patrols.filter(
          (p) =>
            p.status !== "ACTIVE" &&
            (p.syncState === "PENDING" || p.syncState === "FAILED"),
        ).length;
        const incidents = s.incidents.filter((i) => {
          const photoPending = Boolean(i.hasPhoto && i.photoSyncState === "PENDING");
          return i.syncState === "PENDING" || i.syncState === "FAILED" || photoPending;
        }).length;
        const conflicts = s.conflicts.filter(
          (c) => c.syncState === "PENDING" || c.syncState === "FAILED",
        ).length;
        const radio = s.radioMessages.filter((m) => m.syncState === "PENDING").length;
        return patrols + incidents + conflicts + radio;
      },
      startPatrol: () => {
        const existing = get().activePatrol();
        if (existing) return existing;
        const p: Patrol = {
          patrolId: uid(),
          routeId: ROUTE.id,
          routeName: ROUTE.name,
          officerId: "off-mercer",
          officerName: "RN-402 Mercer",
          status: "ACTIVE",
          startedAt: new Date().toISOString(),
          syncState: "PENDING",
          waypoints: [],
        };
        set({ patrols: [p, ...get().patrols] });
        return p;
      },
      addWaypoint: (source, geo) => {
        const active = get().activePatrol();
        if (!active) return null;
        const n = active.waypoints.length + 1;
        const base = geo ?? {
          lat: 6.4 + n * 0.004 + Math.random() * 0.001,
          lng: 81.118 + n * 0.003,
        };
        const wp: Waypoint = {
          pointId: uid(),
          lat: base.lat + (Math.random() - 0.5) * 0.0004,
          lng: base.lng + (Math.random() - 0.5) * 0.0004,
          source,
          recordedAt: new Date().toISOString(),
          label: `WP-${String(n).padStart(2, "0")}`,
        };
        set({
          patrols: get().patrols.map((p) =>
            p.patrolId === active.patrolId
              ? {
                  ...p,
                  waypoints: [...p.waypoints, wp],
                  // A FAILED record keeps its backoff schedule — the new
                  // waypoint ships with the scheduled retry (S2/R-05).
                  syncState: p.syncState === "FAILED" ? "FAILED" : "PENDING",
                }
              : p,
          ),
        });
        return wp;
      },
      undoLastWaypoint: (pointId) => {
        const active = get().activePatrol();
        if (!active) return null;
        if (pointId) {
          const removed = active.waypoints.find((w) => w.pointId === pointId) ?? null;
          if (!removed) return null;
          set({
            patrols: get().patrols.map((p) =>
              p.patrolId === active.patrolId
                ? { ...p, waypoints: p.waypoints.filter((w) => w.pointId !== pointId) }
                : p,
            ),
          });
          return removed;
        }
        const { points, removed } = undoLast(active.waypoints);
        if (!removed) return null;
        set({
          patrols: get().patrols.map((p) =>
            p.patrolId === active.patrolId ? { ...p, waypoints: points } : p,
          ),
        });
        return removed;
      },
      finishPatrol: (summary) => {
        const active = get().activePatrol();
        if (!active) return null;
        // S1/R-05: the in-flight waypoint tail is flushed BEFORE completing.
        const merged = flushWaypointTail(active.waypoints, summary?.flushTail ?? []);
        const done: Patrol = {
          ...active,
          status: "COMPLETED",
          completedAt: new Date().toISOString(),
          syncState: "PENDING",
          waypoints: merged,
          positions: summary?.positions ?? merged.length,
          coveragePct: summary?.coveragePct,
        };
        set({
          patrols: get().patrols.map((p) => (p.patrolId === active.patrolId ? done : p)),
        });
        return done;
      },
      createIncident: (input) => {
        const reportId = uid();
        const photoAttachId = input.hasPhoto ? `${reportId}-photo` : undefined;
        // Product rule: every write is PENDING until Sync upsert-acks the same id.
        const ir: Incident = {
          reportId,
          type: input.type,
          description: input.description,
          lat: 6.405 + Math.random() * 0.01,
          lng: 81.12 + Math.random() * 0.01,
          locationSource: input.locationSource,
          observedAt: new Date().toISOString(),
          syncState: "PENDING",
          hasPhoto: input.hasPhoto,
          photoAttachId,
          photoSyncState: input.hasPhoto ? "PENDING" : undefined,
          demoPartial: Boolean(input.partialPhoto && input.hasPhoto),
        };
        set({ incidents: [ir, ...get().incidents] });
        return ir;
      },
      ackAlert: (alertId) => {
        set({
          alerts: get().alerts.map((a) =>
            a.alertId === alertId
              ? {
                  ...a,
                  status: "ASSIGNED",
                  acknowledgedAt: new Date().toISOString(),
                  deliveryState: a.deliveryState ?? "SENT",
                }
              : a,
          ),
        });
      },
      resolveAlert: (alertId, outcome, note) => {
        set({
          alerts: get().alerts.map((a) =>
            a.alertId === alertId
              ? {
                  ...a,
                  status: "CLOSED",
                  resolvedAt: new Date().toISOString(),
                  outcome,
                  resolutionNote: note,
                }
              : a,
          ),
        });
      },
      resetAlert: (opts) => {
        const now = new Date().toISOString();
        const confidence = opts?.confidence ?? "High";
        const status = opts?.status ?? (confidence === "Low" ? "REVIEW" : "OPEN");
        set({
          alerts: [
            {
              alertId: `AL-${Math.floor(20 + Math.random() * 80)}`,
              animal: "Elephant",
              collar: "EL-07",
              zone: "Farmland",
              observedAt: now,
              receivedAt: now,
              confidence,
              status,
              notifyAttempts: 0,
            },
            ...get().alerts.filter((a) => a.status === "CLOSED"),
          ],
        });
      },
      assignAlert: (alertId, officer) => {
        // R-04: assigning closes any prior active assignment on this alert.
        set({
          alerts: get().alerts.map((a) =>
            a.alertId === alertId
              ? {
                  ...a,
                  status: "ASSIGNED",
                  assigneeId: officer.id,
                  assigneeName: officer.name,
                  deliveryState: "SENT",
                  notifyAttempts: a.notifyAttempts ?? 0,
                }
              : a,
          ),
        });
      },
      failNotify: (alertId) => {
        const current = get().alerts.find((a) => a.alertId === alertId);
        const attempts = (current?.notifyAttempts ?? 0) + 1;
        if (attempts >= 2) {
          set({
            alerts: get().alerts.map((a) =>
              a.alertId === alertId
                ? {
                    ...a,
                    status: "ESCALATED",
                    deliveryState: "FAILED",
                    notifyAttempts: attempts,
                    assigneeId: "off-backup",
                    assigneeName: "Backup RN-511",
                  }
                : a,
            ),
          });
          return "ESCALATED";
        }
        // R-06: restore availability — clear assignee, alert back to OPEN.
        set({
          alerts: get().alerts.map((a) =>
            a.alertId === alertId
              ? {
                  ...a,
                  status: "OPEN",
                  deliveryState: "FAILED",
                  notifyAttempts: attempts,
                  assigneeId: undefined,
                  assigneeName: undefined,
                  acknowledgedAt: undefined,
                }
              : a,
          ),
        });
        return "OPEN";
      },
      escalateAlert: (alertId) => {
        set({
          alerts: get().alerts.map((a) =>
            a.alertId === alertId
              ? {
                  ...a,
                  status: "ESCALATED",
                  assigneeId: "off-backup",
                  assigneeName: "Backup RN-511",
                  deliveryState: "SENT",
                }
              : a,
          ),
        });
      },
      holdForTriage: (alertId) => {
        set({
          alerts: get().alerts.map((a) =>
            a.alertId === alertId ? { ...a, status: "REVIEW", confidence: "Low" } : a,
          ),
        });
      },
      createConflict: (input) => {
        const report: ConflictReport = {
          reportId: uid(),
          type: input.type,
          location: input.location,
          channel: input.channel,
          description: input.description,
          status: "SUBMITTED",
          highPriority: input.type === "Elephant Sighting",
          receivedAt: new Date().toISOString(),
          // Local-first: PENDING until Sync upsert-acks this same reportId.
          syncState: "PENDING",
        };
        set({ conflicts: [report, ...get().conflicts] });
        return report;
      },
      respondConflict: (reportId) => {
        set({
          conflicts: get().conflicts.map((c) =>
            c.reportId === reportId
              ? { ...c, status: "RESPONDED", respondedAt: new Date().toISOString() }
              : c,
          ),
        });
      },
      markConflictSynced: (reportId) => {
        // Prefer synchronize/syncOne; this helper still upserts by the same id
        // so a connectivity-restore path cannot mint a duplicate.
        const conflict = get().conflicts.find((c) => c.reportId === reportId);
        if (!conflict) return;
        if (!get().online) return;
        mirrorUpsertConflict({
          reportId: conflict.reportId,
          type: conflict.type,
          location: conflict.location,
          channel: conflict.channel,
          description: conflict.description,
          syncState: "SYNCED",
        });
        set({
          conflicts: get().conflicts.map((c) =>
            c.reportId === reportId
              ? { ...c, syncState: "SYNCED", retryAfter: undefined, failureReason: undefined }
              : c,
          ),
          lastSyncAt: new Date().toISOString(),
        });
      },
      transmitRadio: (input) => {
        const msg: RadioMessage = {
          messageId: uid(),
          channel: input.channel,
          fromRole: input.fromRole,
          fromTitle: input.fromTitle,
          kind: input.kind,
          text: input.text,
          durationS: input.durationS,
          transmittedAt: new Date().toISOString(),
          // Same contract: PENDING until Sync upsert-acks this messageId.
          syncState: "PENDING",
        };
        set({ radioMessages: [msg, ...get().radioMessages] });
        return msg;
      },
      receiveRadio: (input) => {
        // Over-the-air traffic arrives already acknowledged — the network,
        // not this device, carries it. Only heard when the device is on.
        if (!get().online) return;
        const msg: RadioMessage = {
          messageId: uid(),
          channel: input.channel,
          fromRole: input.fromRole,
          fromTitle: input.fromTitle,
          kind: "text",
          text: input.text,
          transmittedAt: new Date().toISOString(),
          syncState: "SYNCED",
        };
        set({ radioMessages: [msg, ...get().radioMessages] });
      },
      setFeedOn: (v) => set({ feedOn: v }),
      seedRadioLog: (channel) => {
        // Idempotent: the UI calls this on channel open; never duplicate.
        if (get().radioMessages.some((m) => m.channel === channel)) return;
        const history = seedChatter(channel, 4);
        if (history.length === 0) return;
        set({ radioMessages: [...history, ...get().radioMessages] });
      },
      generateReport: (from, to) => {
        const validated = validateCriteria({
          park: "Yala National Park",
          from,
          to,
        });
        if (!validated.ok) {
          throw new Error(validated.error);
        }
        const now = new Date().toISOString();
        const domain = generateSnapshot(
          validated.value,
          {
            patrols: get().patrols.map(toDomainPatrol),
            incidents: get().incidents.map(toDomainIncident),
            alerts: get().alerts.map(toDomainAlert),
          },
          now,
        );
        const snap: ReportSnapshot = {
          reportId: domain.reportId,
          park: domain.park,
          from: domain.from,
          to: domain.to,
          cutoff: domain.cutoff,
          generatedAt: domain.generatedAt,
          incidentCount: domain.incidentCount,
          patrolCount: domain.patrolCount,
          coveragePercent: domain.coveragePercent,
          conflictCount: domain.conflictCount,
          byType: domain.byCategory,
        };
        set({ snapshot: snap });
        return snap;
      },
      queueItems: () => {
        const s = get();
        const recs: QueueRecord[] = [];
        for (const p of s.patrols) {
          if (p.syncState === "SYNCED") continue;
          // Active patrols aren't "pending upload" until completed.
          if (p.status === "ACTIVE") continue;
          recs.push({
            kind: "PATROL",
            recordId: p.patrolId,
            label: `Patrol · ${p.routeName}`,
            sublabel: `${p.waypoints.length} waypoints · ${p.routeId}`,
            syncState: p.syncState === "FAILED" ? "FAILED" : "PENDING",
            syncAttempts: p.syncAttempts ?? 0,
            retryAfter: p.retryAfter,
            failureReason: p.failureReason,
          });
        }
        for (const i of s.incidents) {
          const photoPending = i.hasPhoto && i.photoSyncState === "PENDING";
          if (i.syncState === "SYNCED" && !photoPending) continue;
          recs.push({
            kind: "INCIDENT",
            recordId: i.reportId,
            label: `Incident · ${i.type}`,
            sublabel: photoPending && i.syncState === "SYNCED"
              ? `Photo pending · ${i.photoAttachId ?? "attach"}`
              : i.description,
            syncState: i.syncState === "FAILED" ? "FAILED" : "PENDING",
            syncAttempts: i.syncAttempts ?? 0,
            retryAfter: i.retryAfter,
            failureReason: i.failureReason,
          });
        }
        for (const c of s.conflicts) {
          if (c.syncState === "SYNCED") continue;
          recs.push({
            kind: "CONFLICT",
            recordId: c.reportId,
            label: `Conflict · ${c.type}`,
            sublabel: c.location,
            syncState: c.syncState === "FAILED" ? "FAILED" : "PENDING",
            syncAttempts: c.syncAttempts ?? 0,
            retryAfter: c.retryAfter,
            failureReason: c.failureReason,
          });
        }
        return buildQueue(recs, new Date().toISOString());
      },
      syncOne: async (kind, recordId) => {
        const s = get();
        if (!s.online) {
          // 5b (S2/R-05): transport unreachable → FAILED with a backoff schedule.
          // Same recordId is kept — never mint a new UUID on retry.
          const attempt = syncAttemptsOf(s, kind, recordId) + 1;
          set(
            applyFailed(s, kind, recordId, "Transport unreachable — device offline", attempt),
          );
          return "FAILED";
        }
        // Upload latency, then ConservationAPI upsert by stable id.
        await new Promise((r) => setTimeout(r, 450));
        // 5b — the connection can drop MID-transfer: re-check after the upload.
        if (!get().online) {
          const attempt = syncAttemptsOf(get(), kind, recordId) + 1;
          set(
            applyFailed(
              get(),
              kind,
              recordId,
              "Connection lost during upload — data kept on device",
              attempt,
            ),
          );
          return "FAILED";
        }

        const snap = get();
        if (kind === "PATROL") {
          const patrol = snap.patrols.find((p) => p.patrolId === recordId);
          if (!patrol) return "FAILED";
          mirrorUpsertPatrol(toDomainPatrol(patrol));
          set(applySynced(get(), kind, recordId));
        } else if (kind === "INCIDENT") {
          const incident = snap.incidents.find((i) => i.reportId === recordId);
          if (!incident) return "FAILED";
          mirrorUpsertIncident(toDomainIncident(incident));
          // S3/R-05 demo: first ack flips report only; same attachId stays PENDING.
          if (incident.demoPartial && incident.photoSyncState === "PENDING") {
            set({
              incidents: get().incidents.map((i) =>
                i.reportId === recordId
                  ? {
                      ...i,
                      syncState: "SYNCED" as const,
                      photoSyncState: "PENDING" as const,
                      demoPartial: false,
                      retryAfter: undefined,
                      failureReason: undefined,
                    }
                  : i,
              ),
            });
          } else {
            set(applySynced(get(), kind, recordId));
          }
        } else {
          const conflict = snap.conflicts.find((c) => c.reportId === recordId);
          if (!conflict) return "FAILED";
          mirrorUpsertConflict({
            reportId: conflict.reportId,
            type: conflict.type,
            location: conflict.location,
            channel: conflict.channel,
            description: conflict.description,
            syncState: "SYNCED",
          });
          set(applySynced(get(), kind, recordId));
        }
        set({ lastSyncAt: new Date().toISOString() });
        return "SYNCED";
      },
      retryRecord: async (kind, recordId) => {
        // UC01b (R-02a): manual retry bypasses the backoff schedule entirely.
        return get().syncOne(kind, recordId);
      },
      synchronize: async () => {
        if (!get().online) {
          throw new Error("Offline — records stay PENDING on device.");
        }
        set({ syncing: true });
        const due = get()
          .queueItems()
          .filter((i) => i.retryDue);
        let patrols = 0;
        let incidents = 0;
        for (const item of due) {
          const result = await get().syncOne(item.kind, item.recordId);
          if (result === "SYNCED") {
            if (item.kind === "PATROL") patrols += 1;
            if (item.kind === "INCIDENT") incidents += 1;
          }
        }
        let radio = 0;
        const pendingRadio = get().radioMessages.filter((m) => m.syncState === "PENDING");
        for (const m of pendingRadio) {
          mirrorUpsertRadio({
            messageId: m.messageId,
            channel: m.channel,
            syncState: "SYNCED",
          });
          radio += 1;
        }
        set({
          radioMessages: get().radioMessages.map((m) =>
            m.syncState === "PENDING" ? { ...m, syncState: "SYNCED" as const } : m,
          ),
          lastSyncAt: new Date().toISOString(),
          syncing: false,
        });
        return { patrols, incidents, radio };
      },
    }),
    { name: "trailguard-field", skipHydration: true },
  ),
);

// ---------------------------------------------------------------------------
// Per-record sync helpers (pure state transforms — services are the only
// writers of sync state). Record-level so the UC01b queue can retry one
// record without touching the others (per-record isolation, R-05).
// ---------------------------------------------------------------------------

interface SyncTriple {
  patrols: Patrol[];
  incidents: Incident[];
  conflicts: ConflictReport[];
}

function syncAttemptsOf(s: SyncTriple, kind: QueueKind, recordId: string): number {
  if (kind === "PATROL") return s.patrols.find((p) => p.patrolId === recordId)?.syncAttempts ?? 0;
  if (kind === "INCIDENT") return s.incidents.find((i) => i.reportId === recordId)?.syncAttempts ?? 0;
  return s.conflicts.find((c) => c.reportId === recordId)?.syncAttempts ?? 0;
}

/** Server ack: PENDING/FAILED → SYNCED, schedule cleared (idempotent upsert). */
function applySynced(s: SyncTriple, kind: QueueKind, recordId: string): Partial<SyncTriple> {
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
              // Complete-receipt: photo flips with the report on full ack (S3/R-05).
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
function applyFailed(
  s: SyncTriple,
  kind: QueueKind,
  recordId: string,
  reason: string,
  attempt: number,
): Partial<SyncTriple> {
  // Backoff: 1 min, 2 min, 4 min … capped at 30 minutes (MAX_BACKOFF_MS).
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

export const ROUTE_META = ROUTE;
