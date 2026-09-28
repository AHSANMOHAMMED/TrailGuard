import { test } from "node:test";
import assert from "node:assert/strict";
import { upsertIncident, upsertPatrol } from "./idempotency";
import type { IncidentReport, Patrol, PhotoAttachment, Waypoint } from "./model";

function patrol(overrides: Partial<Patrol> = {}): Patrol {
  return {
    patrolId: "PT-1",
    routeId: "RT-07",
    routeName: "North Ridge Corridor",
    officerId: "off-1",
    officerName: "RN-402 Mercer",
    status: "COMPLETED",
    startedAt: "2026-09-01T06:00:00Z",
    completedAt: "2026-09-01T10:00:00Z",
    syncState: "PENDING",
    waypoints: [],
    ...overrides,
  };
}

function wp(id: string): Waypoint {
  return { pointId: id, geo: { lat: 6.4, lng: 81.12 }, source: "GPS", recordedAt: "2026-09-01T07:00:00Z" };
}

function incident(overrides: Partial<IncidentReport> = {}): IncidentReport {
  return {
    reportId: "IR-1",
    category: "SNARE",
    description: "wire snare",
    geo: { lat: 6.4, lng: 81.12 },
    locationSource: "GPS",
    observedAt: "2026-09-02T09:00:00Z",
    syncState: "PENDING",
    attachments: [],
    ...overrides,
  };
}

function att(id: string): PhotoAttachment {
  return { attachId: id, uri: "file:///p.jpg", mimeType: "image/jpeg", syncState: "PENDING" };
}

test("upsertPatrol creates an unknown patrol", () => {
  const { list, created } = upsertPatrol([], patrol());
  assert.equal(created, true);
  assert.equal(list.length, 1);
});

test("upsertPatrol with same id twice yields exactly one record (idempotency)", () => {
  const first = upsertPatrol([], patrol());
  const second = upsertPatrol(first.list, patrol());
  assert.equal(second.created, false);
  assert.equal(second.list.length, 1);
});

test("upsertPatrol re-send does not duplicate waypoints (retry safety)", () => {
  const p1 = patrol({ waypoints: [wp("w1"), wp("w2")] });
  const first = upsertPatrol([], p1);
  const second = upsertPatrol(first.list, patrol({ waypoints: [wp("w1"), wp("w2"), wp("w3")] }));
  assert.equal(second.list[0].waypoints.length, 3, "only the new waypoint is appended");
});

test("upsertPatrol marks merged record SYNCED", () => {
  const first = upsertPatrol([], patrol({ syncState: "PENDING" }));
  const second = upsertPatrol(first.list, patrol());
  assert.equal(second.list[0].syncState, "SYNCED");
});

test("upsertPatrol keeps completedAt when re-upsert omits it", () => {
  const first = upsertPatrol([], patrol());
  const second = upsertPatrol(first.list, patrol({ completedAt: undefined }));
  assert.equal(second.list[0].completedAt, "2026-09-01T10:00:00Z");
});

test("upsertIncident creates an unknown incident", () => {
  const { list, created } = upsertIncident([], incident());
  assert.equal(created, true);
  assert.equal(list.length, 1);
});

test("upsertIncident with same reportId twice yields exactly one record", () => {
  const first = upsertIncident([], incident());
  const second = upsertIncident(first.list, incident());
  assert.equal(second.created, false);
  assert.equal(second.list.length, 1);
});

test("upsertIncident re-send does not duplicate attachments (partial-upload resume)", () => {
  const withPhoto = incident({ attachments: [att("a1")] });
  const first = upsertIncident([], withPhoto);
  const second = upsertIncident(first.list, incident({ attachments: [att("a1")] }));
  assert.equal(second.list[0].attachments.length, 1);
});

test("upsertIncident appends genuinely new attachments", () => {
  const first = upsertIncident([], incident({ attachments: [att("a1")] }));
  const second = upsertIncident(first.list, incident({ attachments: [att("a1"), att("a2")] }));
  assert.equal(second.list[0].attachments.length, 2);
});
