import assert from "node:assert/strict";
import { test } from "node:test";
import {
  areasFor,
  homeAreasFor,
  isAlertAssigner,
  isAlertResponder,
  isConflictStaff,
  isConflictSubmitter,
} from "./actor-capabilities.ts";

test("ranger covers UC01–UC04 field/staff areas", () => {
  const areas = areasFor("RANGER");
  assert.ok(areas.includes("patrol"));
  assert.ok(areas.includes("incidents"));
  assert.ok(areas.includes("alerts"));
  assert.ok(areas.includes("conflict"));
  assert.equal(areas.includes("reports"), false);
  assert.equal(areas.includes("admin"), false);
});

test("community only submits conflict (+ radio)", () => {
  const areas = areasFor("COMMUNITY");
  assert.deepEqual(areas.filter((a) => a !== "radio"), ["conflict"]);
  assert.equal(isConflictSubmitter("COMMUNITY"), true);
  assert.equal(isConflictStaff("COMMUNITY"), false);
  assert.equal(isAlertResponder("COMMUNITY"), false);
});

test("liaison responds to alerts and staffs conflict desk", () => {
  assert.equal(isAlertResponder("LIAISON"), true);
  assert.equal(isConflictStaff("LIAISON"), true);
  assert.equal(areasFor("LIAISON").includes("patrol"), false);
});

test("manager assigns alerts and can open conflict ops + reports", () => {
  assert.equal(isAlertAssigner("MANAGER"), true);
  assert.equal(isAlertResponder("MANAGER"), false);
  assert.equal(isConflictStaff("MANAGER"), true);
  assert.ok(areasFor("MANAGER").includes("reports"));
  assert.ok(areasFor("MANAGER").includes("conflict"));
});

test("researcher is reports-only (plus radio)", () => {
  const home = homeAreasFor("RESEARCHER", areasFor("RESEARCHER"));
  assert.ok(home.includes("reports"));
  assert.equal(home.includes("patrol"), false);
  assert.equal(home.includes("conflict"), false);
});

test("super admin is staff for conflict and both alert roles", () => {
  assert.equal(isConflictStaff("SUPER_ADMIN"), true);
  assert.equal(isAlertResponder("SUPER_ADMIN"), true);
  assert.equal(isAlertAssigner("SUPER_ADMIN"), true);
});
