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
};

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
  addWaypoint: (source: "GPS" | "MANUAL") => Waypoint | null;
  finishPatrol: (summary?: { positions: number; coveragePct: number }) => Patrol | null;
  createIncident: (input: {
    type: string;
    description: string;
    locationSource: "GPS" | "MANUAL";
    hasPhoto: boolean;
  }) => Incident;
  /** UC03 — ranger acknowledges a risk alert (NEW → ACKNOWLEDGED). */
  ackAlert: (alertId: string) => void;
  /** UC03 — close the alert with an outcome (ACKNOWLEDGED → RESOLVED). */
  resolveAlert: (alertId: string, outcome: string, note?: string) => void;
  /** UC03 — re-raise the demo alert so the flow can be run again. */
  resetAlert: () => void;
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
      pendingCount: () =>
        get().patrols.filter((p) => p.syncState === "PENDING").length +
        get().incidents.filter((i) => i.syncState === "PENDING").length +
        get().conflicts.filter((c) => c.syncState === "PENDING").length +
        get().radioMessages.filter((m) => m.syncState === "PENDING").length,
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
      addWaypoint: (source) => {
        const active = get().activePatrol();
        if (!active) return null;
        const n = active.waypoints.length + 1;
        const wp: Waypoint = {
          pointId: uid(),
          lat: 6.4 + n * 0.004 + Math.random() * 0.001,
          lng: 81.118 + n * 0.003,
          source,
          recordedAt: new Date().toISOString(),
          label: `WP-${String(n).padStart(2, "0")}`,
        };
        set({
          patrols: get().patrols.map((p) =>
            p.patrolId === active.patrolId
              ? { ...p, waypoints: [...p.waypoints, wp], syncState: "PENDING" }
              : p,
          ),
        });
        return wp;
      },
      finishPatrol: (summary) => {
        const active = get().activePatrol();
        if (!active) return null;
        const done: Patrol = {
          ...active,
          status: "COMPLETED",
          completedAt: new Date().toISOString(),
          syncState: "PENDING",
          positions: summary?.positions ?? active.waypoints.length,
          coveragePct: summary?.coveragePct,
        };
        set({
          patrols: get().patrols.map((p) => (p.patrolId === active.patrolId ? done : p)),
        });
        return done;
      },
      createIncident: (input) => {
        const ir: Incident = {
          reportId: uid(),
          type: input.type,
          description: input.description,
          lat: 6.405 + Math.random() * 0.01,
          lng: 81.12 + Math.random() * 0.01,
          locationSource: input.locationSource,
          observedAt: new Date().toISOString(),
          // Online submits ack immediately; offline submits stay on-device (A1/A2).
          syncState: get().online ? "SYNCED" : "PENDING",
          hasPhoto: input.hasPhoto,
        };
        set({ incidents: [ir, ...get().incidents] });
        return ir;
      },
      ackAlert: (alertId) => {
        set({
          alerts: get().alerts.map((a) =>
            a.alertId === alertId
              ? { ...a, status: "ASSIGNED", acknowledgedAt: new Date().toISOString() }
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
      resetAlert: () => {
        const now = new Date().toISOString();
        set({
          alerts: [
            {
              alertId: `AL-${Math.floor(20 + Math.random() * 80)}`,
              animal: "Elephant",
              collar: "EL-07",
              zone: "Farmland",
              observedAt: now,
              receivedAt: now,
              confidence: "High",
              status: "OPEN",
            },
            ...get().alerts,
          ],
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
          syncState: get().online ? "SYNCED" : "PENDING",
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
        set({
          conflicts: get().conflicts.map((c) =>
            c.reportId === reportId ? { ...c, syncState: "SYNCED" } : c,
          ),
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
          // Same contract as incidents: acked when online, queued when not.
          syncState: get().online ? "SYNCED" : "PENDING",
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
        const fromD = new Date(from).getTime();
        const toD = new Date(to + "T23:59:59").getTime();
        const syncedInc = get().incidents.filter((i) => {
          const t = new Date(i.observedAt).getTime();
          return i.syncState === "SYNCED" && t >= fromD && t <= toD;
        });
        const syncedPat = get().patrols.filter((p) => {
          const t = new Date(p.startedAt).getTime();
          return p.syncState === "SYNCED" && p.status === "COMPLETED" && t >= fromD && t <= toD;
        });
        const byType: Record<string, number> = {};
        for (const i of syncedInc) byType[i.type] = (byType[i.type] ?? 0) + 1;
        const snap: ReportSnapshot = {
          reportId: uid(),
          park: "Yala National Park",
          from,
          to,
          cutoff: new Date(to + "T23:59:59").toISOString(),
          generatedAt: new Date().toISOString(),
          incidentCount: syncedInc.length,
          patrolCount: syncedPat.length,
          coveragePercent: Math.min(92, 48 + syncedPat.length * 10 + syncedInc.length * 4),
          conflictCount: get().alerts.length,
          byType,
        };
        set({ snapshot: snap });
        return snap;
      },
      synchronize: async () => {
        if (!get().online) {
          throw new Error("Offline — records stay PENDING on device.");
        }
        set({ syncing: true });
        await new Promise((r) => setTimeout(r, 850));
        let patrols = 0;
        let incidents = 0;
        let radio = 0;
        set({
          patrols: get().patrols.map((p) => {
            if (p.syncState === "PENDING" && p.status === "COMPLETED") {
              patrols += 1;
              return { ...p, syncState: "SYNCED" };
            }
            return p;
          }),
          incidents: get().incidents.map((i) => {
            if (i.syncState === "PENDING") {
              incidents += 1;
              return { ...i, syncState: "SYNCED" };
            }
            return i;
          }),
          conflicts: get().conflicts.map((c) =>
            c.syncState === "PENDING" ? { ...c, syncState: "SYNCED" } : c,
          ),
          radioMessages: get().radioMessages.map((m) => {
            if (m.syncState === "PENDING") {
              radio += 1;
              return { ...m, syncState: "SYNCED" };
            }
            return m;
          }),
          lastSyncAt: new Date().toISOString(),
          syncing: false,
        });
        return { patrols, incidents, radio };
      },
    }),
    { name: "trailguard-field", skipHydration: true },
  ),
);

export const ROUTE_META = ROUTE;
