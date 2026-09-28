import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Alert,
  Assignment,
  Incident,
  Officer,
  Patrol,
  ReportSnapshot,
  Waypoint,
} from "@/lib/types";
import { uid } from "@/lib/utils";

const ROUTE = {
  id: "RT-07",
  name: "North Ridge Corridor",
  sector: "Sector 04-North",
  distanceKm: 12.4,
  estTime: "4h 30m",
  gainM: 640,
};

const SEED_OFFICERS: Officer[] = [
  { officerId: "off-mercer", name: "RN-402 Mercer", role: "RANGER", available: false },
  { officerId: "off-silva", name: "Ranger Silva", role: "RANGER", available: true },
  { officerId: "off-fernando", name: "Liaison Fernando", role: "LIAISON", available: true },
];

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
          { pointId: "wp-s1", lat: 6.401, lng: 81.118, source: "GPS", recordedAt: t0, label: "WP-01" },
          { pointId: "wp-s2", lat: 6.412, lng: 81.126, source: "GPS", recordedAt: t1, label: "WP-08" },
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

interface FieldState {
  online: boolean;
  syncing: boolean;
  lastSyncAt: string | null;
  patrols: Patrol[];
  incidents: Incident[];
  alerts: Alert[];
  assignments: Assignment[];
  officers: Officer[];
  snapshot: ReportSnapshot | null;
  setOnline: (v: boolean) => void;
  startPatrol: () => Patrol;
  addWaypoint: (source: "GPS" | "MANUAL") => Waypoint | null;
  undoWaypoint: () => void;
  finishPatrol: () => Patrol | null;
  createIncident: (input: {
    type: string;
    description: string;
    locationSource: "GPS" | "MANUAL";
    hasPhoto: boolean;
  }) => Incident;
  ingestCollar: () => Alert | null;
  assignOfficer: (alertId: string, officerId: string) => Assignment | null;
  acknowledge: (raId: string) => void;
  generateReport: (from: string, to: string) => ReportSnapshot;
  synchronize: () => Promise<{ patrols: number; incidents: number }>;
  activePatrol: () => Patrol | undefined;
  pendingCount: () => number;
}

export const useField = create<FieldState>()(
  persist(
    (set, get) => ({
      online: true,
      syncing: false,
      lastSyncAt: "2026-08-31T06:12:00Z",
      patrols: seeded.patrols,
      incidents: seeded.incidents,
      officers: SEED_OFFICERS,
      snapshot: null,
      alerts: [
        {
          alertId: "AL-19",
          animal: "Elephant",
          zone: "Z3 Farmland",
          observedAt: "2026-09-24T11:02:00Z",
          receivedAt: "2026-09-24T11:04:00Z",
          confidence: "High",
          status: "OPEN",
        },
      ],
      assignments: [],
      setOnline: (v) => set({ online: v }),
      activePatrol: () => get().patrols.find((p) => p.status === "ACTIVE"),
      pendingCount: () =>
        get().patrols.filter((p) => p.syncState === "PENDING").length +
        get().incidents.filter((i) => i.syncState === "PENDING").length,
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
      /** One-tap undo for the last manual mark (R-10: easy reversal). */
      undoWaypoint: () => {
        const active = get().activePatrol();
        if (!active || active.waypoints.length === 0) return;
        set({
          patrols: get().patrols.map((p) =>
            p.patrolId === active.patrolId
              ? { ...p, waypoints: p.waypoints.slice(0, -1) }
              : p,
          ),
        });
      },
      finishPatrol: () => {
        const active = get().activePatrol();
        if (!active) return null;
        const done: Patrol = {
          ...active,
          status: "COMPLETED",
          completedAt: new Date().toISOString(),
          syncState: "PENDING",
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
          syncState: "PENDING",
          hasPhoto: input.hasPhoto,
        };
        set({ incidents: [ir, ...get().incidents] });
        return ir;
      },
      ingestCollar: () => {
        const openSame = get().alerts.find(
          (a) => a.animal === "Elephant" && a.zone === "Z3 Farmland" && a.status !== "CLOSED",
        );
        if (openSame) {
          const updated = {
            ...openSame,
            receivedAt: new Date().toISOString(),
          };
          set({
            alerts: get().alerts.map((a) => (a.alertId === openSame.alertId ? updated : a)),
          });
          return updated;
        }
        const alert: Alert = {
          alertId: `AL-${Math.floor(20 + Math.random() * 80)}`,
          animal: "Elephant",
          zone: "Z3 Farmland",
          observedAt: new Date().toISOString(),
          receivedAt: new Date().toISOString(),
          confidence: "High",
          status: "OPEN",
        };
        set({ alerts: [alert, ...get().alerts] });
        return alert;
      },
      assignOfficer: (alertId, officerId) => {
        const officer = get().officers.find((o) => o.officerId === officerId);
        if (!officer) return null;
        const ra: Assignment = {
          raId: uid(),
          alertId,
          officerId,
          officerName: officer.name,
          deliveryState: get().online ? "SENT" : "FAILED",
          createdAt: new Date().toISOString(),
        };
        set({
          assignments: [ra, ...get().assignments],
          alerts: get().alerts.map((a) =>
            a.alertId === alertId ? { ...a, status: "ASSIGNED" } : a,
          ),
          officers: get().officers.map((o) =>
            o.officerId === officerId ? { ...o, available: false } : o,
          ),
        });
        return ra;
      },
      acknowledge: (raId) => {
        set({
          assignments: get().assignments.map((a) =>
            a.raId === raId ? { ...a, acknowledgedAt: new Date().toISOString() } : a,
          ),
        });
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
          lastSyncAt: new Date().toISOString(),
          syncing: false,
        });
        return { patrols, incidents };
      },
    }),
    { name: "trailguard-field", skipHydration: true },
  ),
);

export const ROUTE_META = ROUTE;
