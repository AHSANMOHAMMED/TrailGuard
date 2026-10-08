import type { Alert, Incident, Patrol } from "@/lib/types";
import { YALA_ROUTE } from "@/lib/domain/yala-route";

/** Viva-only sample SYNCED rows — not loaded on boot (graded path starts empty). */
export function buildDemoDataset(): {
  patrols: Patrol[];
  incidents: Incident[];
  alerts: Alert[];
} {
  const t0 = new Date("2026-08-12T06:10:00Z").toISOString();
  const t1 = new Date("2026-08-12T10:40:00Z").toISOString();
  return {
    patrols: [
      {
        patrolId: "pt-seed-01",
        routeId: YALA_ROUTE.id,
        routeName: YALA_ROUTE.name,
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
  };
}
