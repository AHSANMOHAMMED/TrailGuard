import { test } from "node:test";
import assert from "node:assert/strict";
import { SyncService } from "./sync-service";
import type { ConservationApi, FieldStore, PendingRecord } from "./ports";
import type { IncidentReport, Patrol, PhotoAttachment, SyncAck } from "./model";

/** In-memory FieldStore fake — mirrors the contract the zustand adapter implements. */
class FakeStore implements FieldStore {
  patrols: Patrol[] = [];
  incidents: IncidentReport[] = [];
  synced: string[] = [];
  failed: Array<{ id: string; retryAfter: string }> = [];

  getPatrols() { return this.patrols; }
  savePatrol(p: Patrol) {
    const idx = this.patrols.findIndex((x) => x.patrolId === p.patrolId);
    if (idx === -1) this.patrols.push(p);
    else this.patrols[idx] = p;
  }
  getIncidents() { return this.incidents; }
  saveIncident(i: IncidentReport) {
    const idx = this.incidents.findIndex((x) => x.reportId === i.reportId);
    if (idx === -1) this.incidents.push(i);
    else this.incidents[idx] = i;
  }
  pending(now: string): PendingRecord[] {
    const out: PendingRecord[] = [];
    for (const p of this.patrols) {
      if (p.syncState === "PENDING") out.push({ kind: "PATROL", recordId: p.patrolId });
      if (p.syncState === "FAILED" && (!p.retryAfter || new Date(p.retryAfter).getTime() <= new Date(now).getTime())) {
        out.push({ kind: "PATROL", recordId: p.patrolId });
      }
    }
    for (const i of this.incidents) {
      if (i.syncState === "PENDING") out.push({ kind: "INCIDENT", recordId: i.reportId });
      if (i.syncState === "FAILED" && (!i.retryAfter || new Date(i.retryAfter).getTime() <= new Date(now).getTime())) {
        out.push({ kind: "INCIDENT", recordId: i.reportId });
      }
    }
    return out;
  }
  markPatrolSynced(id: string) { this.synced.push(id); this.patrols = this.patrols.map((p) => (p.patrolId === id ? { ...p, syncState: "SYNCED" as const } : p)); }
  markPatrolFailed(id: string, retryAfter: string) { this.failed.push({ id, retryAfter }); this.patrols = this.patrols.map((p) => (p.patrolId === id ? { ...p, syncState: "FAILED" as const, retryAfter } : p)); }
  markIncidentFailed(id: string, retryAfter: string) { this.failed.push({ id, retryAfter }); this.incidents = this.incidents.map((i) => (i.reportId === id ? { ...i, syncState: "FAILED" as const, retryAfter } : i)); }
}

function ack(recordId: string, complete = true): SyncAck {
  return { recordId, version: 1, complete, receivedAt: "2026-09-20T12:00:00Z" };
}

function patrol(over: Partial<Patrol> = {}): Patrol {
  return {
    patrolId: "PT-1",
    routeId: "RT-07",
    routeName: "North Ridge",
    officerId: "off-1",
    officerName: "Mercer",
    status: "COMPLETED",
    startedAt: "2026-09-19T06:00:00Z",
    completedAt: "2026-09-19T10:00:00Z",
    syncState: "PENDING",
    waypoints: [],
    ...over,
  };
}

function incident(attachments: PhotoAttachment[] = []): IncidentReport {
  return {
    reportId: "IR-1",
    category: "SNARE",
    description: "wire snare",
    geo: { lat: 6.4, lng: 81.12 },
    locationSource: "GPS",
    observedAt: "2026-09-19T09:00:00Z",
    syncState: "PENDING",
    attachments,
  };
}

test("synchronize drains an empty queue without touching the transport", async () => {
  const store = new FakeStore();
  let calls = 0;
  const api: ConservationApi = {
    upsertPatrol: async () => { calls += 1; return ack("x"); },
    upsertIncident: async () => { calls += 1; return ack("x"); },
  };
  const r = await new SyncService(store, api).synchronize();
  assert.equal(calls, 0);
  assert.equal(r.patrols + r.incidents + r.failed, 0);
});

test("full ack marks a patrol SYNCED (UC01 P5-P6)", async () => {
  const store = new FakeStore();
  store.savePatrol(patrol());
  const api: ConservationApi = { upsertPatrol: async (p) => ack(p.patrolId), upsertIncident: async (i) => ack(i.reportId) };
  const r = await new SyncService(store, api, () => "2026-09-20T12:00:00Z").synchronize();
  assert.equal(r.patrols, 1);
  assert.deepEqual(store.synced, ["PT-1"]);
  assert.equal(store.patrols[0].syncState, "SYNCED");
});

test("transport failure marks the record FAILED with a retryAfter schedule (S2/R-05)", async () => {
  const store = new FakeStore();
  store.savePatrol(patrol());
  const api: ConservationApi = {
    upsertPatrol: async () => { throw new Error("timeout"); },
    upsertIncident: async (i) => ack(i.reportId),
  };
  const r = await new SyncService(store, api, () => "2026-09-20T12:00:00Z").synchronize();
  assert.equal(r.failed, 1);
  assert.deepEqual(r.failures[0].reason, "timeout");
  assert.equal(store.patrols[0].syncState, "FAILED");
  assert.ok(store.patrols[0].retryAfter, "backoff scheduled");
});

test("one failing record does not block the others (per-record isolation)", async () => {
  const store = new FakeStore();
  const good = patrol();
  const bad = patrol({ patrolId: "PT-BAD", startedAt: "2026-09-19T07:00:00Z" });
  store.savePatrol(good);
  store.savePatrol(bad);
  const api: ConservationApi = {
    upsertPatrol: async (p) => { if (p.patrolId === "PT-BAD") throw new Error("rejected"); return ack(p.patrolId); },
    upsertIncident: async (i) => ack(i.reportId),
  };
  const r = await new SyncService(store, api, () => "2026-09-20T12:00:00Z").synchronize();
  assert.equal(r.patrols, 1, "good record still synced");
  assert.equal(r.failed, 1, "bad record failed alone");
  assert.equal(store.patrols.find((p) => p.patrolId === "PT-1")?.syncState, "SYNCED");
  assert.equal(store.patrols.find((p) => p.patrolId === "PT-BAD")?.syncState, "FAILED");
});

test("partial upload: report SYNCED, media stays PENDING with the same attachId (S3/R-05)", async () => {
  const store = new FakeStore();
  const photo: PhotoAttachment = { attachId: "a1", uri: "file:///p.jpg", mimeType: "image/jpeg", syncState: "PENDING" };
  store.saveIncident(incident([photo]));
  const api: ConservationApi = {
    upsertPatrol: async (p) => ack(p.patrolId),
    upsertIncident: async (i) => ack(i.reportId, false), // report acked, media not
  };
  const r = await new SyncService(store, api, () => "2026-09-20T12:00:00Z").synchronize();
  assert.equal(r.partialIncidents, 1);
  const saved = store.incidents[0];
  assert.equal(saved.syncState, "SYNCED", "report acked");
  assert.equal(saved.attachments[0].syncState, "PENDING", "media pending");
  assert.equal(saved.attachments[0].attachId, "a1", "same ID for resume");
});

test("complete receipt marks incident and attachments SYNCED (UC02 I4-I6)", async () => {
  const store = new FakeStore();
  const photo: PhotoAttachment = { attachId: "a1", uri: "file:///p.jpg", mimeType: "image/jpeg", syncState: "PENDING" };
  store.saveIncident(incident([photo]));
  const api: ConservationApi = {
    upsertPatrol: async (p) => ack(p.patrolId),
    upsertIncident: async (i) => ack(i.reportId, true),
  };
  const r = await new SyncService(store, api, () => "2026-09-20T12:00:00Z").synchronize();
  assert.equal(r.incidents, 1);
  assert.equal(r.partialIncidents, 0);
  const saved = store.incidents[0];
  assert.equal(saved.syncState, "SYNCED");
  assert.equal(saved.attachments[0].syncState, "SYNCED");
});

test("FAILED record inside its backoff window is not re-attempted", async () => {
  const store = new FakeStore();
  store.savePatrol(patrol({ syncState: "FAILED", retryAfter: "2026-09-20T13:00:00Z" }));
  let calls = 0;
  const api: ConservationApi = {
    upsertPatrol: async (p) => { calls += 1; return ack(p.patrolId); },
    upsertIncident: async (i) => ack(i.reportId),
  };
  await new SyncService(store, api, () => "2026-09-20T12:00:00Z").synchronize();
  assert.equal(calls, 0, "backoff not yet elapsed");
});
