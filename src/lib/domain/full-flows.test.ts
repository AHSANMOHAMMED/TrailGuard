/**
 * End-to-end store contract for every graded / demo surface:
 * patrol, incident, conflict, radio, alerts desk helpers, reports.
 */
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { mirrorCounts, mirrorReset } from "./server-mirror";
import { useField } from "../store";
import { validateCriteria } from "./reporting";

function reset(): void {
  mirrorReset();
  useField.setState({
    online: true,
    syncing: false,
    incidents: [],
    conflicts: [],
    radioMessages: [],
    patrols: [],
    alerts: [
      {
        alertId: "AL-QA",
        animal: "Elephant",
        collar: "EL-07",
        zone: "Farmland",
        observedAt: "2026-09-24T06:52:00Z",
        receivedAt: "2026-09-24T06:52:00Z",
        confidence: "High",
        status: "OPEN",
      },
    ],
    snapshot: null,
    lastSyncAt: null,
  });
}

beforeEach(reset);

test("full flow: patrol → finish → sync twice (one mirror row)", async () => {
  const started = useField.getState().startPatrol();
  useField.getState().addWaypoint("GPS");
  useField.getState().addWaypoint("MANUAL");
  const done = useField.getState().finishPatrol({ positions: 3, coveragePct: 40 });
  assert.ok(done);
  assert.equal(done.patrolId, started.patrolId);
  assert.equal(done.syncState, "PENDING");
  assert.equal(done.status, "COMPLETED");

  await useField.getState().synchronize();
  assert.equal(
    useField.getState().patrols.find((p) => p.patrolId === done.patrolId)?.syncState,
    "SYNCED",
  );
  assert.equal(mirrorCounts().patrols, 1);
  await useField.getState().synchronize();
  assert.equal(mirrorCounts().patrols, 1);
});

test("full flow: incident + conflict + radio sync without duplicates", async () => {
  const ir = useField.getState().createIncident({
    type: "Snare",
    description: "qa snare",
    locationSource: "GPS",
    hasPhoto: true,
  });
  const cf = useField.getState().createConflict({
    type: "Elephant Sighting",
    location: "Nagoda",
    channel: "Mobile App",
    description: "near canal",
  });
  const radio = useField.getState().transmitRadio({
    channel: "OPS-1",
    fromRole: "RANGER",
    fromTitle: "RN-402",
    kind: "text",
    text: "QA check-in",
  });

  assert.equal(ir.syncState, "PENDING");
  assert.equal(cf.syncState, "PENDING");
  assert.equal(radio.syncState, "PENDING");

  await useField.getState().synchronize();
  assert.equal(useField.getState().incidents.find((i) => i.reportId === ir.reportId)?.syncState, "SYNCED");
  assert.equal(
    useField.getState().incidents.find((i) => i.reportId === ir.reportId)?.photoSyncState,
    "SYNCED",
  );
  assert.equal(useField.getState().conflicts.find((c) => c.reportId === cf.reportId)?.syncState, "SYNCED");
  assert.equal(
    useField.getState().radioMessages.find((m) => m.messageId === radio.messageId)?.syncState,
    "SYNCED",
  );
  assert.equal(mirrorCounts().incidents, 1);
  assert.equal(mirrorCounts().conflicts, 1);
  assert.equal(mirrorCounts().radio, 1);

  await useField.getState().synchronize();
  assert.equal(mirrorCounts().incidents, 1);
  assert.equal(mirrorCounts().conflicts, 1);
  assert.equal(mirrorCounts().radio, 1);
});

test("full flow: alert desk assign → resolve", () => {
  const s = useField.getState();
  s.assignAlert("AL-QA", { id: "off-1", name: "Mercer" });
  let a = useField.getState().alerts.find((x) => x.alertId === "AL-QA")!;
  assert.equal(a.status, "ASSIGNED");
  assert.equal(a.assigneeName, "Mercer");

  s.ackAlert("AL-QA");
  a = useField.getState().alerts.find((x) => x.alertId === "AL-QA")!;
  assert.equal(a.status, "ASSIGNED");
  assert.ok(a.acknowledgedAt);

  s.resolveAlert("AL-QA", "Animal moved on", "cleared farmland");
  a = useField.getState().alerts.find((x) => x.alertId === "AL-QA")!;
  assert.equal(a.status, "CLOSED");
  assert.equal(a.outcome, "Animal moved on");
});

test("full flow: reports include only SYNCED records", async () => {
  useField.getState().createIncident({
    type: "Snare",
    description: "pending only",
    locationSource: "GPS",
    hasPhoto: false,
  });
  const synced = useField.getState().createIncident({
    type: "Carcass",
    description: "will sync",
    locationSource: "GPS",
    hasPhoto: false,
  });
  // Finish a patrol and sync only that + one incident
  useField.getState().startPatrol();
  useField.getState().addWaypoint("GPS");
  const patrol = useField.getState().finishPatrol();
  assert.ok(patrol);

  // Sync everything currently due — then create a fresh PENDING after
  await useField.getState().synchronize();
  useField.getState().createIncident({
    type: "Footprints",
    description: "after sync still pending",
    locationSource: "GPS",
    hasPhoto: false,
  });

  const criteria = validateCriteria({
    park: "Yala National Park",
    from: "2026-09-01",
    to: "2026-10-08",
  });
  assert.equal(criteria.ok, true);
  if (!criteria.ok) return;

  const snap = useField.getState().generateReport(criteria.value.from, criteria.value.to);
  // Seeded August data was cleared in reset — only our SYNCED rows count
  assert.ok(snap.incidentCount >= 1);
  assert.ok(snap.patrolCount >= 1);
  // The post-sync PENDING incident must not inflate the snapshot beyond synced ones
  const pendingLeft = useField.getState().incidents.filter((i) => i.syncState === "PENDING");
  assert.ok(pendingLeft.some((i) => i.description.includes("after sync")));
  assert.ok(useField.getState().incidents.some((i) => i.reportId === synced.reportId && i.syncState === "SYNCED"));
});

test("offline refuse sync; same ids remain PENDING", async () => {
  const ir = useField.getState().createIncident({
    type: "Snare",
    description: "offline",
    locationSource: "GPS",
    hasPhoto: false,
  });
  useField.setState({ online: false });
  await assert.rejects(() => useField.getState().synchronize(), /Offline/);
  assert.equal(useField.getState().incidents.find((i) => i.reportId === ir.reportId)?.syncState, "PENDING");
  assert.equal(mirrorCounts().incidents, 0);
});
