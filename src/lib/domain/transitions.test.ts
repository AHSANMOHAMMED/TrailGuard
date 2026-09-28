import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyAck,
  backoffAfter,
  closePriorAssignments,
  completePatrol,
  isAlertOpen,
  isRetryDue,
  markFailed,
  markPending,
  markSynced,
  MAX_BACKOFF_MS,
  releaseAssignment,
  withStatus,
} from "./transitions";
import type { Alert, IncidentReport, Patrol, ResponseAssignment } from "./model";

// ---------------------------------------------------------------------------
// Sync state machine
// ---------------------------------------------------------------------------

test("markSynced flips PENDING to SYNCED and clears retry", () => {
  const r = markSynced({ syncState: "PENDING", retryAfter: "2026-09-01T00:00:00Z" });
  assert.equal(r.syncState, "SYNCED");
  assert.equal(r.retryAfter, undefined);
});

test("markPending resets FAILED records for manual retry", () => {
  const r = markPending({ syncState: "FAILED", retryAfter: "2026-09-01T00:00:00Z" });
  assert.equal(r.syncState, "PENDING");
  assert.equal(r.retryAfter, undefined);
});

test("markFailed records a retryAfter timestamp", () => {
  const r = markFailed<{ syncState: "PENDING"; retryAfter?: string }>({ syncState: "PENDING" }, "2026-09-01T00:05:00Z");
  assert.equal(r.syncState, "FAILED");
  assert.equal(r.retryAfter, "2026-09-01T00:05:00Z");
});

test("isRetryDue: PENDING is always due", () => {
  assert.equal(isRetryDue({ syncState: "PENDING" }, "2026-09-01T00:00:00Z"), true);
});

test("isRetryDue: FAILED before retryAfter elapses is not due", () => {
  const r = markFailed({ syncState: "PENDING" }, "2026-09-01T00:05:00Z");
  assert.equal(isRetryDue(r, "2026-09-01T00:04:59Z"), false);
});

test("isRetryDue: FAILED becomes due once retryAfter elapses", () => {
  const r = markFailed({ syncState: "PENDING" }, "2026-09-01T00:05:00Z");
  assert.equal(isRetryDue(r, "2026-09-01T00:05:01Z"), true);
});

test("isRetryDue: FAILED without a schedule is immediately due", () => {
  assert.equal(isRetryDue({ syncState: "FAILED" }, "2026-09-01T00:00:00Z"), true);
});

// ---------------------------------------------------------------------------
// Backoff schedule (R-05: exponential, capped at 30 min)
// ---------------------------------------------------------------------------

test("backoffAfter attempt 1 waits 1 minute", () => {
  const t = backoffAfter(1, "2026-09-01T00:00:00Z");
  assert.equal(t, "2026-09-01T00:01:00.000Z");
});

test("backoffAfter attempt 2 waits 2 minutes, attempt 3 waits 4", () => {
  assert.equal(backoffAfter(2, "2026-09-01T00:00:00Z"), "2026-09-01T00:02:00.000Z");
  assert.equal(backoffAfter(3, "2026-09-01T00:00:00Z"), "2026-09-01T00:04:00.000Z");
});

test("backoffAfter caps at MAX_BACKOFF_MS (30 minutes)", () => {
  const t = new Date(backoffAfter(20, "2026-09-01T00:00:00Z")).getTime();
  const base = new Date("2026-09-01T00:00:00Z").getTime();
  assert.equal(t - base, MAX_BACKOFF_MS);
});

test("backoffAfter negative attempt is treated as attempt 1", () => {
  assert.equal(backoffAfter(-3, "2026-09-01T00:00:00Z"), "2026-09-01T00:01:00.000Z");
});

// ---------------------------------------------------------------------------
// Patrol transitions (S1/R-05)
// ---------------------------------------------------------------------------

function patrol(): Patrol {
  return {
    patrolId: "PT-1",
    routeId: "RT-07",
    routeName: "North Ridge",
    officerId: "off-1",
    officerName: "Mercer",
    status: "ACTIVE",
    startedAt: "2026-09-01T06:00:00Z",
    syncState: "PENDING",
    waypoints: [],
  };
}

test("completePatrol flushes the in-flight waypoint tail before completion", () => {
  const done = completePatrol(patrol(), [{ pointId: "w9", geo: { lat: 6.41, lng: 81.13 }, source: "GPS", recordedAt: "2026-09-01T10:00:00Z" }], "2026-09-01T10:00:01Z");
  assert.equal(done.status, "COMPLETED");
  assert.equal(done.waypoints.length, 1, "tail waypoint included");
  assert.equal(done.completedAt, "2026-09-01T10:00:01Z");
});

test("completePatrol rejects a patrol that is not ACTIVE (double-finish)", () => {
  const done = completePatrol(patrol(), [], "2026-09-01T10:00:01Z");
  assert.throws(() => completePatrol(done, [], "2026-09-01T11:00:00Z"), /not active/);
});

// ---------------------------------------------------------------------------
// Incident partial acknowledgement (S3/R-05)
// ---------------------------------------------------------------------------

function incident(): IncidentReport {
  return {
    reportId: "IR-1",
    category: "SNARE",
    description: "wire snare",
    geo: { lat: 6.4, lng: 81.12 },
    locationSource: "GPS",
    observedAt: "2026-09-02T09:00:00Z",
    syncState: "PENDING",
    attachments: [{ attachId: "a1", uri: "file:///p.jpg", mimeType: "image/jpeg", syncState: "PENDING" }],
  };
}

test("applyAck complete flips report AND attachments to SYNCED", () => {
  const r = applyAck(incident(), true);
  assert.equal(r.syncState, "SYNCED");
  assert.equal(r.attachments[0].syncState, "SYNCED");
});

test("applyAck partial keeps attachment PENDING with the same attachId", () => {
  const r = applyAck(incident(), false);
  assert.equal(r.syncState, "SYNCED", "report itself is acked");
  assert.equal(r.attachments[0].syncState, "PENDING", "media resumes later");
  assert.equal(r.attachments[0].attachId, "a1", "same ID — no duplicate on resume");
});

test("applyAck partial leaves already-synced attachments untouched", () => {
  const inc = incident();
  inc.attachments[0].syncState = "SYNCED";
  const r = applyAck(inc, false);
  assert.equal(r.attachments[0].syncState, "SYNCED");
});

// ---------------------------------------------------------------------------
// Alert / assignment rules (R-04, R-06)
// ---------------------------------------------------------------------------

function ra(id: string, alertId: string, over: Partial<ResponseAssignment> = {}): ResponseAssignment {
  return {
    raId: id,
    alertId,
    officerId: "off-1",
    officerName: "Mercer",
    deliveryState: "SENT",
    createdAt: "2026-09-01T11:00:00Z",
    ...over,
  };
}

test("closePriorAssignments marks the prior unacked assignment superseded", () => {
  const prior = ra("RA-1", "AL-1");
  const out = closePriorAssignments([prior], "AL-1");
  assert.equal(out[0].outcome, "superseded");
  assert.equal(out[0].acknowledgedAt, undefined);
});

test("closePriorAssignments leaves other alerts' assignments untouched", () => {
  const other = ra("RA-2", "AL-2");
  const out = closePriorAssignments([other], "AL-1");
  assert.equal(out[0].outcome, undefined);
});

test("closePriorAssignments keeps an acknowledged assignment as history", () => {
  const acked = ra("RA-3", "AL-1", { acknowledgedAt: "2026-09-01T11:30:00Z" });
  const out = closePriorAssignments([acked], "AL-1");
  assert.equal(out[0].outcome, undefined);
  assert.equal(out[0].acknowledgedAt, "2026-09-01T11:30:00Z");
});

test("releaseAssignment marks delivery FAILED so the officer can be freed (R-06)", () => {
  const out = releaseAssignment(ra("RA-1", "AL-1"));
  assert.equal(out.deliveryState, "FAILED");
});

function alert(): Alert {
  return {
    alertId: "AL-1",
    animal: "Elephant",
    zoneId: "Z3",
    zoneName: "Z3 Farmland",
    confidence: "HIGH",
    status: "OPEN",
    observedAt: "2026-09-01T11:00:00Z",
    receivedAt: "2026-09-01T11:02:00Z",
  };
}

test("withStatus produces a new alert with the requested status (immutability)", () => {
  const a = alert();
  const escalated = withStatus(a, "ESCALATED");
  assert.equal(escalated.status, "ESCALATED");
  assert.equal(a.status, "OPEN", "original untouched");
});

test("isAlertOpen treats OPEN and ESCALATED as actionable", () => {
  assert.equal(isAlertOpen(alert()), true);
  assert.equal(isAlertOpen(withStatus(alert(), "ESCALATED")), true);
  assert.equal(isAlertOpen(withStatus(alert(), "CLOSED")), false);
});
