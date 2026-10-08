import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canTransmitOn,
  channelsFor,
  defaultChannel,
  radioFromRole,
} from "./radio-acl.ts";

test("community may only use the Community channel", () => {
  assert.deepEqual(channelsFor("COMMUNITY"), ["CMN-3"]);
  assert.equal(canTransmitOn("COMMUNITY", "CMN-3"), true);
  assert.equal(canTransmitOn("COMMUNITY", "OPS-1"), false);
  assert.equal(canTransmitOn("COMMUNITY", "EMG-7"), false);
});

test("staff may use the full VHF plan", () => {
  for (const role of ["RANGER", "LIAISON", "MANAGER", "RESEARCHER"] as const) {
    assert.deepEqual(channelsFor(role), ["OPS-1", "EMG-7", "CMN-3"]);
    assert.equal(canTransmitOn(role, "OPS-1"), true);
    assert.equal(canTransmitOn(role, "EMG-7"), true);
  }
});

test("default channel matches actor role", () => {
  assert.equal(defaultChannel("COMMUNITY"), "CMN-3");
  assert.equal(defaultChannel("LIAISON"), "CMN-3");
  assert.equal(defaultChannel("RANGER"), "OPS-1");
  assert.equal(defaultChannel("MANAGER"), "OPS-1");
  assert.equal(defaultChannel("RESEARCHER"), "CMN-3");
});

test("radioFromRole maps auth actors to radio log roles", () => {
  assert.equal(radioFromRole("RANGER"), "RANGER");
  assert.equal(radioFromRole("COMMUNITY"), "RANGER");
  assert.equal(radioFromRole("LIAISON"), "LIAISON");
  assert.equal(radioFromRole("MANAGER"), "MANAGER");
  assert.equal(radioFromRole("RESEARCHER"), "MANAGER");
});
