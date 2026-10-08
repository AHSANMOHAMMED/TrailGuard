import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEMO_COVER_POSITIONS,
  DEMO_GPS_EVERY,
  coverageChip,
  demoProgress,
  formatPatrolDuration,
  queueBadgeLabel,
  waypointLabel,
} from "./patrol-demo";

test("waypointLabel pads ordinals", () => {
  assert.equal(waypointLabel(1), "WP-01");
  assert.equal(waypointLabel(12), "WP-12");
});

test("coverageChip reflects the 95% gate language", () => {
  assert.equal(coverageChip(0), "0% covered");
  assert.equal(coverageChip(40), "40% covered");
  assert.equal(coverageChip(95), "Route covered");
});

test("queueBadgeLabel distinguishes clear, pending, and failed", () => {
  assert.match(queueBadgeLabel(0, 0), /clear/i);
  assert.match(queueBadgeLabel(3, 0), /pending/i);
  assert.match(queueBadgeLabel(3, 1), /failed/i);
});

test("formatPatrolDuration formats minutes and seconds", () => {
  assert.equal(formatPatrolDuration(45), "45 s");
  assert.equal(formatPatrolDuration(125), "2 m 05 s");
});

test("demoProgress clamps to the cover window", () => {
  assert.equal(demoProgress(0), 0);
  assert.equal(demoProgress(DEMO_COVER_POSITIONS), 1);
  assert.equal(demoProgress(DEMO_COVER_POSITIONS * 2), 1);
  assert.ok(DEMO_GPS_EVERY >= 1);
});
