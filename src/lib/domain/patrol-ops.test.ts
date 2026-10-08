import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildQueue,
  coveragePercent,
  flushWaypointTail,
  isRouteCovered,
  nextAutoRetryLabel,
  patrolTrackKm,
  queueDepth,
  undoLastWaypoint,
  type QueueRecord,
} from "./patrol-ops.ts";

function wp(id: string, lat: number, lng: number) {
  return { pointId: id, lat, lng, source: "GPS" as const, recordedAt: "2026-09-01T10:00:00Z" };
}

// --------------------------------------------------------------- R-07 coverage

test("coveragePercent: half the route covered → 50%", () => {
  assert.equal(coveragePercent(3.7, 7.4), 50);
});

test("coveragePercent: capped at 100 even when track overshoots the route", () => {
  assert.equal(coveragePercent(9.9, 7.4), 100);
});

test("coveragePercent: zero-length route → 0%, never NaN", () => {
  assert.equal(coveragePercent(3.7, 0), 0);
  assert.equal(coveragePercent(3.7, NaN), 0);
});

test("coveragePercent: no track → 0% (empty-window zero state)", () => {
  assert.equal(coveragePercent(0, 7.4), 0);
});

test("patrolTrackKm: haversine length of a two-point track", () => {
  // ~1.11 km per 0.01° latitude.
  const km = patrolTrackKm([wp("a", 6.4, 81.12), wp("b", 6.41, 81.12)]);
  assert.ok(km > 1.0 && km < 1.25, `expected ≈1.11 km, got ${km}`);
});

test("patrolTrackKm: single point → 0 km", () => {
  assert.equal(patrolTrackKm([wp("a", 6.4, 81.12)]), 0);
});

test("isRouteCovered: gate at 95% default", () => {
  assert.equal(isRouteCovered(94), false);
  assert.equal(isRouteCovered(95), true);
});

// ------------------------------------------------------- 3b undo (R-10)

test("undoLastWaypoint removes exactly the last waypoint", () => {
  const pts = [wp("w1", 6.4, 81.12), wp("w2", 6.41, 81.12), wp("w3", 6.42, 81.12)];
  const { points, removed } = undoLastWaypoint(pts);
  assert.deepEqual(points.map((p) => p.pointId), ["w1", "w2"]);
  assert.equal(removed?.pointId, "w3");
});

test("undoLastWaypoint: empty list is a safe no-op", () => {
  const { points, removed } = undoLastWaypoint([]);
  assert.deepEqual(points, []);
  assert.equal(removed, null);
});

test("undoLastWaypoint: single waypoint → back to empty", () => {
  const { points, removed } = undoLastWaypoint([wp("w1", 6.4, 81.12)]);
  assert.deepEqual(points, []);
  assert.equal(removed?.pointId, "w1");
});

// ------------------------------------------------- S1/R-05 in-flight flush

test("flushWaypointTail appends the in-flight tail before completion", () => {
  const pts = [wp("w1", 6.4, 81.12)];
  const merged = flushWaypointTail(pts, [wp("w2", 6.41, 81.12)]);
  assert.deepEqual(merged.map((p) => p.pointId), ["w1", "w2"]);
});

test("flushWaypointTail dedups by stable pointId on a retried flush", () => {
  const pts = [wp("w1", 6.4, 81.12), wp("w2", 6.41, 81.12)];
  const merged = flushWaypointTail(pts, [wp("w2", 6.41, 81.12), wp("w3", 6.42, 81.12)]);
  assert.deepEqual(merged.map((p) => p.pointId), ["w1", "w2", "w3"]);
});

// --------------------------------------------------- UC01b retry queue (R-02a)

const NOW = "2026-09-01T10:30:00Z";

function rec(overrides: Partial<QueueRecord>): QueueRecord {
  return {
    kind: "PATROL",
    recordId: "pt-1",
    label: "Patrol NB-03",
    syncState: "PENDING",
    syncAttempts: 0,
    ...overrides,
  };
}

test("buildQueue: PENDING records are retry-due immediately", () => {
  const [item] = buildQueue([rec({})], NOW);
  assert.equal(item.retryDue, true);
  assert.equal(item.holding, false);
});

test("buildQueue: FAILED inside its backoff window is held, not due", () => {
  const [item] = buildQueue(
    [rec({ syncState: "FAILED", retryAfter: "2026-09-01T10:31:00Z", syncAttempts: 2 })],
    NOW,
  );
  assert.equal(item.retryDue, false);
  assert.equal(item.holding, true);
  assert.equal(item.syncAttempts, 2);
});

test("buildQueue: FAILED past its backoff window becomes retry-due", () => {
  const [item] = buildQueue(
    [rec({ syncState: "FAILED", retryAfter: "2026-09-01T10:29:00Z", failureReason: "timeout" })],
    NOW,
  );
  assert.equal(item.retryDue, true);
  assert.equal(item.holding, false);
  assert.equal(item.failureReason, "timeout");
});

test("buildQueue: FAILED without a schedule is treated as due", () => {
  const [item] = buildQueue([rec({ syncState: "FAILED" })], NOW);
  assert.equal(item.retryDue, true);
});

test("queueDepth counts pending and failed records", () => {
  const items = buildQueue(
    [
      rec({ recordId: "a" }),
      rec({ recordId: "b", syncState: "FAILED", retryAfter: "2026-09-01T10:31:00Z" }),
    ],
    NOW,
  );
  assert.equal(queueDepth(items), 2);
});

test("nextAutoRetryLabel formats the countdown", () => {
  assert.equal(nextAutoRetryLabel("2026-09-01T10:29:30Z", NOW), "now");
  assert.equal(nextAutoRetryLabel("2026-09-01T10:30:45Z", NOW), "in 45s");
  assert.equal(nextAutoRetryLabel("2026-09-01T10:32:00Z", NOW), "in 2 m");
  assert.equal(nextAutoRetryLabel("2026-09-01T10:32:05Z", NOW), "in 2 m 05 s");
});
