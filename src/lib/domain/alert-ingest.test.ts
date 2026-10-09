import assert from "node:assert/strict";
import { test } from "node:test";
import {
  YALA_FARMLAND,
  demoCollarReading,
  ingestAndAssess,
} from "./alert-ingest";

test("UC03 ingest: high-confidence in-zone creates PAGE alert", () => {
  const reading = demoCollarReading("High");
  const d = ingestAndAssess(reading, YALA_FARMLAND, []);
  assert.equal(d.kind, "create");
  if (d.kind !== "create") return;
  assert.equal(d.triage, "PAGE");
  assert.equal(d.status, "OPEN");
  assert.equal(d.collar, "EL-07");
  assert.equal(d.zone, "Farmland");
});

test("UC03 ingest: low-confidence in-zone goes to REVIEW_QUEUE", () => {
  const reading = demoCollarReading("Low");
  const d = ingestAndAssess(reading, YALA_FARMLAND, []);
  assert.equal(d.kind, "create");
  if (d.kind !== "create") return;
  assert.equal(d.triage, "REVIEW_QUEUE");
  assert.equal(d.status, "REVIEW");
});

test("UC03 ingest: outside zone is ignored", () => {
  const reading = { ...demoCollarReading("High"), lat: 7.5, lng: 80.0 };
  const d = ingestAndAssess(reading, YALA_FARMLAND, []);
  assert.deepEqual(d, { kind: "ignore", reason: "outside_zone" });
});

test("UC03 ingest: stale reading is ignored", () => {
  const reading = {
    ...demoCollarReading("High"),
    observedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  };
  const d = ingestAndAssess(reading, YALA_FARMLAND, []);
  assert.deepEqual(d, { kind: "ignore", reason: "stale" });
});

test("UC03 ingest: same animal+zone refreshes existing open alert", () => {
  const reading = demoCollarReading("High");
  const d = ingestAndAssess(reading, YALA_FARMLAND, [
    {
      alertId: "AL-42",
      animal: "Elephant",
      zone: "Farmland",
      status: "OPEN",
    },
  ]);
  assert.equal(d.kind, "refresh");
  if (d.kind !== "refresh") return;
  assert.equal(d.alertId, "AL-42");
});
