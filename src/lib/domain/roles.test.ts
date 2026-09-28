import { test } from "node:test";
import assert from "node:assert/strict";
import { can, profileFor, ROLES, ROLE_ORDER } from "./roles";

test("every role in ROLE_ORDER has a profile", () => {
  for (const r of ROLE_ORDER) {
    const p = profileFor(r);
    assert.ok(p, `${r} profile missing`);
    assert.ok(p.permissions.length > 0, `${r} has no permissions`);
  }
});

// --- Ranger: field data capture (UC01/UC02) + own acks ----------------------

test("ranger can run patrols", () => {
  assert.equal(can("RANGER", "patrol:start"), true);
  assert.equal(can("RANGER", "patrol:waypoint"), true);
  assert.equal(can("RANGER", "patrol:finish"), true);
  assert.equal(can("RANGER", "patrol:sync"), true);
  assert.equal(can("RANGER", "patrol:retry"), true);
});

test("ranger can create incidents but not review camera traps", () => {
  assert.equal(can("RANGER", "incident:create"), true);
  assert.equal(can("RANGER", "incident:camera-review"), false);
});

test("ranger acknowledges assignments but never assigns (UC03)", () => {
  assert.equal(can("RANGER", "conflict:acknowledge"), true);
  assert.equal(can("RANGER", "conflict:assign"), false);
  assert.equal(can("RANGER", "conflict:close"), false);
});

test("ranger cannot generate reports (UC04 is manager/researcher)", () => {
  assert.equal(can("RANGER", "report:generate"), false);
  assert.equal(can("RANGER", "report:export"), false);
});

// --- Park Manager: coordination + reporting ---------------------------------

test("manager assigns, escalates, and ingests (UC03)", () => {
  assert.equal(can("MANAGER", "conflict:assign"), true);
  assert.equal(can("MANAGER", "conflict:escalate"), true);
  assert.equal(can("MANAGER", "conflict:ingest"), true);
});

test("manager does NOT close with outcome (that is the liaison, R-02c)", () => {
  assert.equal(can("MANAGER", "conflict:close"), false);
});

test("manager reviews camera-trap images (UC02)", () => {
  assert.equal(can("MANAGER", "incident:camera-review"), true);
  assert.equal(can("MANAGER", "incident:create"), false, "manager is desk-side, not field-side");
});

test("manager generates and exports reports (UC04)", () => {
  assert.equal(can("MANAGER", "report:generate"), true);
  assert.equal(can("MANAGER", "report:export"), true);
});

test("manager cannot start patrols or drop waypoints (UC01 is the ranger's)", () => {
  assert.equal(can("MANAGER", "patrol:start"), false);
  assert.equal(can("MANAGER", "patrol:waypoint"), false);
  assert.equal(can("MANAGER", "patrol:finish"), false);
});

// --- Liaison: community-facing conflict lifecycle ---------------------------

test("liaison closes with outcome and acknowledges (R-02c)", () => {
  assert.equal(can("LIAISON", "conflict:close"), true);
  assert.equal(can("LIAISON", "conflict:acknowledge"), true);
  assert.equal(can("LIAISON", "conflict:escalate"), true);
});

test("liaison has no patrol, incident, or report rights", () => {
  assert.equal(can("LIAISON", "patrol:start"), false);
  assert.equal(can("LIAISON", "incident:create"), false);
  assert.equal(can("LIAISON", "report:generate"), false);
});

// --- Researcher: read-side analytics only -----------------------------------

test("researcher can generate and export reports (UC04)", () => {
  assert.equal(can("RESEARCHER", "report:generate"), true);
  assert.equal(can("RESEARCHER", "report:export"), true);
});

test("researcher has no operational rights at all", () => {
  assert.equal(can("RESEARCHER", "patrol:start"), false);
  assert.equal(can("RESEARCHER", "patrol:sync"), false);
  assert.equal(can("RESEARCHER", "incident:create"), false);
  assert.equal(can("RESEARCHER", "conflict:assign"), false);
  assert.equal(can("RESEARCHER", "conflict:acknowledge"), false);
});

// --- Edge / error cases ------------------------------------------------------

test("unknown role is denied everything (fail closed)", () => {
  assert.equal(can("INTERN", "patrol:start"), false);
  assert.equal(can("", "report:export"), false);
});

test("permission checks are pure — repeated calls agree", () => {
  assert.equal(can("RANGER", "patrol:start"), can("RANGER", "patrol:start"));
});

test("role profiles carry display personas", () => {
  assert.equal(ROLES.RANGER.officerName, "RN-402 Mercer");
  assert.equal(ROLES.RESEARCHER.name, "Researcher");
});
