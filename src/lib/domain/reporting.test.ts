import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSnapshot, ROUTE_INDEX, validateCriteria, MAX_WINDOW_DAYS } from "./reporting";
import type { Alert, IncidentReport, Patrol } from "./model";

function patrol(over: Partial<Patrol> = {}): Patrol {
  return {
    patrolId: "PT-1",
    routeId: "RT-07",
    routeName: "North Ridge Corridor",
    officerId: "off-1",
    officerName: "Mercer",
    status: "COMPLETED",
    startedAt: "2026-09-10T06:00:00Z",
    completedAt: "2026-09-10T10:00:00Z",
    syncState: "SYNCED",
    waypoints: [],
    ...over,
  };
}

function incident(over: Partial<IncidentReport> = {}): IncidentReport {
  return {
    reportId: "IR-1",
    category: "SNARE",
    description: "wire snare",
    geo: { lat: 6.4, lng: 81.12 },
    locationSource: "GPS",
    observedAt: "2026-09-12T09:00:00Z",
    syncState: "SYNCED",
    attachments: [],
    ...over,
  };
}

const criteria = { park: "Yala National Park", from: "2026-09-01", to: "2026-09-30" };

// ---------------------------------------------------------------------------
// Criteria validation (S5/R-07)
// ---------------------------------------------------------------------------

test("validateCriteria accepts a normal monthly window", () => {
  const r = validateCriteria(criteria);
  assert.equal(r.ok, true);
});

test("validateCriteria rejects an inverted range", () => {
  const r = validateCriteria({ ...criteria, from: "2026-10-01", to: "2026-09-01" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /before/);
});

test("validateCriteria rejects windows beyond the cap", () => {
  const r = validateCriteria({ ...criteria, from: "2026-01-01", to: "2026-09-30" });
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, new RegExp(String(MAX_WINDOW_DAYS)));
});

test("validateCriteria rejects invalid dates", () => {
  const r = validateCriteria({ ...criteria, from: "not-a-date" });
  assert.equal(r.ok, false);
});

// ---------------------------------------------------------------------------
// Snapshot aggregation (T2/R-07)
// ---------------------------------------------------------------------------

test("generateSnapshot counts only SYNCED incidents in the window", () => {
  const snap = generateSnapshot(criteria, {
    patrols: [],
    incidents: [
      incident(),
      incident({ reportId: "IR-2", category: "CROP_RAID", observedAt: "2026-09-13T09:00:00Z" }),
      incident({ reportId: "IR-3", syncState: "PENDING" }), // excluded: pending
      incident({ reportId: "IR-4", observedAt: "2026-08-01T09:00:00Z" }), // excluded: out of window
    ],
    alerts: [],
  }, "2026-09-30T23:00:00Z");
  assert.equal(snap.incidentCount, 2);
  assert.equal(snap.byCategory["SNARE"], 1);
  assert.equal(snap.byCategory["CROP_RAID"], 1);
});

test("generateSnapshot counts only SYNCED COMPLETED patrols", () => {
  const snap = generateSnapshot(criteria, {
    patrols: [
      patrol(),
      patrol({ patrolId: "PT-2", status: "ACTIVE" }), // excluded: not completed
      patrol({ patrolId: "PT-3", syncState: "PENDING" }), // excluded: pending
    ],
    incidents: [],
    alerts: [],
  }, "2026-09-30T23:00:00Z");
  assert.equal(snap.patrolCount, 1);
});

test("coverage is capped at 100 percent", () => {
  const long = Array.from({ length: 50 }, (_, i) => ({
    pointId: `w${i}`,
    geo: { lat: 6.4 + i * 0.01, lng: 81.12 },
    source: "GPS" as const,
    recordedAt: "2026-09-10T07:00:00Z",
  }));
  const snap = generateSnapshot(criteria, {
    patrols: [patrol({ waypoints: long })],
    incidents: [],
    alerts: [],
  }, "2026-09-30T23:00:00Z");
  assert.equal(snap.coveragePercent, 100);
});

test("coverage is zero for an empty window (explicit zero state, S5)", () => {
  const snap = generateSnapshot(criteria, { patrols: [], incidents: [], alerts: [] }, "2026-09-30T23:00:00Z");
  assert.equal(snap.incidentCount, 0);
  assert.equal(snap.patrolCount, 0);
  assert.equal(snap.coveragePercent, 0);
  assert.equal(snap.cutoff, "2026-09-30T23:00:00Z", "cutoff still recorded");
});

test("same window produces the same reportId (stable snapshot id for export)", () => {
  const a = generateSnapshot(criteria, { patrols: [], incidents: [], alerts: [] }, "2026-09-30T23:00:00Z");
  const b = generateSnapshot(criteria, { patrols: [], incidents: [], alerts: [] }, "2026-10-01T01:00:00Z");
  assert.equal(a.reportId, b.reportId);
});

test("route distance comes from the route index (known route)", () => {
  assert.equal(ROUTE_INDEX["RT-07"].distanceKm, 12.4);
});

test("alerts feed the conflict count", () => {
  const alerts: Alert[] = [
    {
      alertId: "AL-1",
      animal: "Elephant",
      zoneId: "Z3",
      zoneName: "Z3 Farmland",
      confidence: "HIGH",
      status: "OPEN",
      observedAt: "2026-09-14T11:00:00Z",
      receivedAt: "2026-09-14T11:02:00Z",
    },
  ];
  const snap = generateSnapshot(criteria, { patrols: [], incidents: [], alerts }, "2026-09-30T23:00:00Z");
  assert.equal(snap.conflictCount, 1);
});
