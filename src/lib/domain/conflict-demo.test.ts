import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SMS_SHORT_CODE,
  conflictAckLabel,
  conflictChannelHint,
  conflictPatternNote,
  isHighPriorityConflict,
} from "./conflict-demo";

test("Elephant Sighting is high priority", () => {
  assert.equal(isHighPriorityConflict("Elephant Sighting"), true);
  assert.equal(isHighPriorityConflict("Crop Raiding"), false);
});

test("SMS hint includes short code", () => {
  assert.match(conflictChannelHint("SMS"), new RegExp(SMS_SHORT_CODE));
});

test("ack label never says Submitted while PENDING", () => {
  assert.equal(conflictAckLabel("PENDING", false), "Pending sync");
  assert.equal(conflictAckLabel("SYNCED", false), "Submitted");
  assert.equal(conflictAckLabel("SYNCED", true), "Synchronised");
});

test("pattern note requires two or more reports", () => {
  assert.equal(conflictPatternNote("Crop Raiding", 1), null);
  assert.match(conflictPatternNote("Crop Raiding", 2) ?? "", /trend/i);
});
