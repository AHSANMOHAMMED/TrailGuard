import assert from "node:assert/strict";
import { test } from "node:test";
import { patrolSyncHint, patrolSyncStatusLabel } from "./patrol-sync-copy";

test("patrolSyncStatusLabel covers PENDING FAILED SYNCED", () => {
  assert.match(patrolSyncStatusLabel("PENDING"), /Pending/i);
  assert.match(patrolSyncStatusLabel("FAILED"), /failed/i);
  assert.match(patrolSyncStatusLabel("SYNCED"), /Synchronized/i);
});

test("patrolSyncHint never invents a new id story", () => {
  assert.match(patrolSyncHint("FAILED"), /same UUID/i);
  assert.match(patrolSyncHint("SYNCED"), /upsert/i);
});
