/**
 * No-duplicate sync contract: create once with a stable UUID → offline /
 * online / fail / retry keep that id → Sync upserts by id → SYNCED only after
 * ack → Sync again never grows the server-mirror count.
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  mirrorCounts,
  mirrorHasIncident,
  mirrorHasPatrol,
  mirrorReset,
  mirrorUpsertConflict,
  mirrorUpsertIncident,
  mirrorUpsertPatrol,
} from "./server-mirror";
import type { IncidentReport, Patrol } from "./model";
import { useField } from "../store";

function resetDeviceStore(): void {
  useField.setState({
    online: true,
    syncing: false,
    incidents: [],
    conflicts: [],
    radioMessages: [],
    patrols: [],
    lastSyncAt: null,
  });
}

function basePatrol(over: Partial<Patrol> = {}): Patrol {
  return {
    patrolId: "PT-stable-1",
    routeId: "NB-03",
    routeName: "North Boundary Patrol",
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

function baseIncident(over: Partial<IncidentReport> = {}): IncidentReport {
  return {
    reportId: "IR-stable-1",
    category: "SNARE",
    description: "wire snare",
    geo: { lat: 6.4, lng: 81.12 },
    locationSource: "GPS",
    observedAt: "2026-09-19T09:00:00Z",
    syncState: "PENDING",
    attachments: [],
    ...over,
  };
}

beforeEach(() => {
  mirrorReset();
  resetDeviceStore();
});

test("incident upsert: first sync creates one row; second sync keeps count 1", () => {
  const ir = baseIncident();
  const first = mirrorUpsertIncident({ ...ir, syncState: "SYNCED" });
  assert.equal(first.created, true);
  assert.equal(mirrorCounts().incidents, 1);
  assert.ok(mirrorHasIncident(ir.reportId));

  const second = mirrorUpsertIncident({ ...ir, syncState: "SYNCED", description: "retry" });
  assert.equal(second.created, false);
  assert.equal(mirrorCounts().incidents, 1);
});

test("patrol finish then sync twice → one patrol id", () => {
  const p = basePatrol();
  assert.equal(mirrorUpsertPatrol({ ...p, syncState: "SYNCED" }).created, true);
  assert.equal(mirrorUpsertPatrol({ ...p, syncState: "SYNCED" }).created, false);
  assert.equal(mirrorCounts().patrols, 1);
  assert.ok(mirrorHasPatrol(p.patrolId));
});

test("conflict upsert by reportId is idempotent", () => {
  const id = "CF-stable-1";
  assert.equal(
    mirrorUpsertConflict({
      reportId: id,
      type: "Elephant Sighting",
      location: "Nagoda",
      channel: "Mobile App",
      description: "near canal",
      syncState: "SYNCED",
    }).created,
    true,
  );
  assert.equal(
    mirrorUpsertConflict({
      reportId: id,
      type: "Elephant Sighting",
      location: "Nagoda",
      channel: "Mobile App",
      description: "near canal (retry)",
      syncState: "SYNCED",
    }).created,
    false,
  );
  assert.equal(mirrorCounts().conflicts, 1);
});

test("partial photo: same reportId + same attachId; retry does not mint a second incident", () => {
  const reportId = "IR-photo-1";
  const attachId = `${reportId}-photo`;
  const withPhoto = baseIncident({
    reportId,
    attachments: [
      {
        attachId,
        uri: "local://photo",
        mimeType: "image/jpeg",
        syncState: "PENDING",
      },
    ],
  });

  // First ack: report upserted (mirror marks SYNCED); device would keep photo PENDING.
  const first = mirrorUpsertIncident({ ...withPhoto, syncState: "SYNCED" });
  assert.equal(first.created, true);
  assert.equal(mirrorCounts().incidents, 1);

  // Retry photo only — same reportId and attachId.
  const retry = mirrorUpsertIncident({
    ...withPhoto,
    syncState: "SYNCED",
    attachments: [
      {
        attachId,
        uri: "local://photo",
        mimeType: "image/jpeg",
        syncState: "SYNCED",
      },
    ],
  });
  assert.equal(retry.created, false);
  assert.equal(mirrorCounts().incidents, 1);
  assert.ok(mirrorHasIncident(reportId));
});

test("offline→online→double-sync: mirror length unchanged on second pass", () => {
  // Simulate device queue drain: upsert each PENDING once, then empty queue.
  const ir = baseIncident({ reportId: "IR-offline-1" });
  const p = basePatrol({ patrolId: "PT-offline-1" });

  // Offline: no upsert happens — mirror stays empty.
  assert.equal(mirrorCounts().incidents, 0);
  assert.equal(mirrorCounts().patrols, 0);

  // Online pass 1
  mirrorUpsertIncident({ ...ir, syncState: "SYNCED" });
  mirrorUpsertPatrol({ ...p, syncState: "SYNCED" });
  const afterFirst = mirrorCounts();
  assert.equal(afterFirst.incidents, 1);
  assert.equal(afterFirst.patrols, 1);

  // Online pass 2 (device queue empty / re-upsert same ids)
  const ir2 = mirrorUpsertIncident({ ...ir, syncState: "SYNCED" });
  const p2 = mirrorUpsertPatrol({ ...p, syncState: "SYNCED" });
  assert.equal(ir2.created, false);
  assert.equal(p2.created, false);
  assert.deepEqual(mirrorCounts(), afterFirst);
});

test("store: createIncident stays PENDING with one stable id", () => {
  const ir = useField.getState().createIncident({
    type: "Snare",
    description: "wire",
    locationSource: "GPS",
    hasPhoto: true,
  });
  assert.equal(ir.syncState, "PENDING");
  assert.equal(ir.photoSyncState, "PENDING");
  assert.ok(ir.photoAttachId?.startsWith(ir.reportId));
  assert.equal(useField.getState().incidents.filter((i) => i.reportId === ir.reportId).length, 1);
});

test("store: offline sync throws; online sync then second sync keeps one mirror row", async () => {
  const ir = useField.getState().createIncident({
    type: "Snare",
    description: "wire",
    locationSource: "GPS",
    hasPhoto: false,
  });
  const id = ir.reportId;

  useField.setState({ online: false });
  await assert.rejects(() => useField.getState().synchronize(), /Offline/);
  assert.equal(useField.getState().incidents.find((i) => i.reportId === id)?.syncState, "PENDING");
  assert.equal(mirrorCounts().incidents, 0);

  useField.setState({ online: true });
  await useField.getState().synchronize();
  assert.equal(useField.getState().incidents.find((i) => i.reportId === id)?.syncState, "SYNCED");
  assert.equal(mirrorCounts().incidents, 1);

  await useField.getState().synchronize();
  assert.equal(mirrorCounts().incidents, 1);
  assert.equal(useField.getState().incidents.filter((i) => i.reportId === id).length, 1);
});

test("store: partial photo keeps same attachId; second sync completes photo only", async () => {
  const ir = useField.getState().createIncident({
    type: "Snare",
    description: "partial demo",
    locationSource: "GPS",
    hasPhoto: true,
    partialPhoto: true,
  });
  const id = ir.reportId;
  const attachId = ir.photoAttachId;
  assert.ok(attachId);

  await useField.getState().synchronize();
  const afterFirst = useField.getState().incidents.find((i) => i.reportId === id)!;
  assert.equal(afterFirst.syncState, "SYNCED");
  assert.equal(afterFirst.photoSyncState, "PENDING");
  assert.equal(afterFirst.photoAttachId, attachId);
  assert.equal(mirrorCounts().incidents, 1);

  await useField.getState().synchronize();
  const afterSecond = useField.getState().incidents.find((i) => i.reportId === id)!;
  assert.equal(afterSecond.syncState, "SYNCED");
  assert.equal(afterSecond.photoSyncState, "SYNCED");
  assert.equal(afterSecond.photoAttachId, attachId);
  assert.equal(mirrorCounts().incidents, 1);
});

test("store: finishPatrol then synchronize twice → one patrol on mirror", async () => {
  const started = useField.getState().startPatrol();
  useField.getState().addWaypoint("GPS");
  const done = useField.getState().finishPatrol();
  assert.ok(done);
  assert.equal(done.patrolId, started.patrolId);
  assert.equal(done.syncState, "PENDING");

  await useField.getState().synchronize();
  assert.equal(
    useField.getState().patrols.find((p) => p.patrolId === done.patrolId)?.syncState,
    "SYNCED",
  );
  assert.equal(mirrorCounts().patrols, 1);

  await useField.getState().synchronize();
  assert.equal(mirrorCounts().patrols, 1);
});
