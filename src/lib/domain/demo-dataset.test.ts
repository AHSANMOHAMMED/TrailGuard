import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDemoDataset } from "./demo-dataset";

describe("buildDemoDataset (viva-only, not auto-loaded)", () => {
  it("returns SYNCED sample rows for reports / alerts demos", () => {
    const demo = buildDemoDataset();
    assert.ok(demo.patrols.length >= 1);
    assert.ok(demo.incidents.length >= 1);
    assert.ok(demo.alerts.some((a) => a.collar === "EL-07"));
    assert.ok(demo.patrols.every((p) => p.syncState === "SYNCED"));
    assert.ok(demo.incidents.every((i) => i.syncState === "SYNCED"));
  });
});
