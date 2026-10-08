import assert from "node:assert/strict";
import { test } from "node:test";
import { incidentAckTitle, incidentStatusRow, photoAttachId } from "./incident-demo";

test("incidentAckTitle never says Submitted while pending", () => {
  assert.equal(incidentAckTitle(false, false), "Incident Saved");
  assert.equal(incidentAckTitle(true, false), "Incident Submitted");
  assert.equal(incidentAckTitle(true, true), "Incident Synchronised");
});

test("incidentStatusRow covers partial photo branch", () => {
  assert.equal(
    incidentStatusRow({ fullyAcked: false, wasOffline: false, photoStillPending: true, reportSynced: true }),
    "REPORT SYNCED · PHOTO PENDING",
  );
});

test("photoAttachId stays derived from reportId", () => {
  assert.equal(photoAttachId("IR-1"), "IR-1-photo");
});
