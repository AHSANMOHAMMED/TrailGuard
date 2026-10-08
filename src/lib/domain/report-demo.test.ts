import assert from "node:assert/strict";
import { test } from "node:test";
import { exportFilename, pendingExcludedLabel, snapshotEmptyMessage } from "./report-demo";

test("pendingExcludedLabel", () => {
  assert.match(pendingExcludedLabel(0), /0/);
  assert.match(pendingExcludedLabel(2), /2/);
});

test("exportFilename keeps stable id prefix", () => {
  assert.equal(exportFilename("rep-abcdef12-zzzz"), "trailguard-rep-abcde.csv");
});

test("empty snapshot message mentions SYNCED-only", () => {
  assert.match(snapshotEmptyMessage(), /SYNCED/);
});
