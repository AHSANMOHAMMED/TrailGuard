import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { handleMobileUpsert, fieldHealthPayload } from "./field-sync-http";

describe("field-sync-http mobile upserts (shared DB)", () => {
  it("upserts patrol from mobile snake_case payload", async () => {
    const ack = await handleMobileUpsert("patrol", {
      patrol_id: "p-shared-1",
      route_id: "r-yala-1",
      officer_id: "off-4021",
      status: "COMPLETED",
      started_at: "2026-10-08T10:00:00.000Z",
      completed_at: "2026-10-08T12:00:00.000Z",
      waypoints: [
        {
          point_id: "w1",
          geo: { lat: 6.4, lng: 81.4 },
          source: "GPS",
          recorded_at: "2026-10-08T10:05:00.000Z",
        },
      ],
    });
    assert.equal(ack.id, "p-shared-1");
    assert.equal(ack.complete, true);
  });

  it("upserts incident and conflict", async () => {
    const incident = await handleMobileUpsert("incident", {
      report_id: "i-shared-1",
      park_id: "yala",
      type: "Snare",
      description: "Wire near gate",
      geo: { lat: 6.41, lng: 81.41 },
      location_source: "GPS",
      observed_at: "2026-10-08T11:00:00.000Z",
      attachments: [],
    });
    assert.equal(incident.id, "i-shared-1");
    assert.equal(incident.complete, true);

    const conflict = await handleMobileUpsert("conflict", {
      conflict_id: "c-shared-1",
      park_id: "yala",
      species: "Elephant",
      risk_level: "HIGH",
      geo: { lat: 6.42, lng: 81.42 },
      observed_at: "2026-10-08T11:30:00.000Z",
      notes: "Near village fence",
    });
    assert.equal(conflict.id, "c-shared-1");
    assert.equal(conflict.complete, true);
  });

  it("rejects unknown kind", async () => {
    await assert.rejects(
      () => handleMobileUpsert("nope", {}),
      /Unknown kind/,
    );
  });

  it("reports shared health with counts", async () => {
    const health = await fieldHealthPayload();
    assert.equal(health.app, "TrailGuard");
    assert.equal(health.shared, true);
    assert.ok(health.counts.patrols >= 1);
    assert.ok(health.counts.incidents >= 1);
    assert.ok(health.counts.conflicts >= 1);
  });

  it("idempotent patrol upsert does not duplicate rows", async () => {
    const before = await fieldHealthPayload();
    const payload = {
      patrol_id: "p-idem-1",
      route_id: "r-yala-1",
      officer_id: "off-4021",
      status: "COMPLETED",
      started_at: "2026-10-08T10:00:00.000Z",
      waypoints: [],
    };
    await handleMobileUpsert("patrol", payload);
    await handleMobileUpsert("patrol", { ...payload, status: "COMPLETED" });
    const after = await fieldHealthPayload();
    assert.equal(after.counts.patrols, before.counts.patrols + 1);
  });
});

