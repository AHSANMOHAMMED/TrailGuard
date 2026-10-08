import assert from "node:assert/strict";
import { test } from "node:test";
import { isAlertOpen, withStatus } from "./transitions.ts";
import type { Alert } from "./model.ts";

function base(): Alert {
  return {
    alertId: "AL-1",
    animal: "Elephant",
    zoneId: "farm",
    zoneName: "Farmland",
    confidence: "HIGH",
    status: "OPEN",
    observedAt: "2026-09-24T06:52:00Z",
    receivedAt: "2026-09-24T06:52:00Z",
  };
}

test("escalated alerts remain actionable for the desk", () => {
  assert.equal(isAlertOpen(withStatus(base(), "ESCALATED")), true);
  assert.equal(isAlertOpen(withStatus(base(), "CLOSED")), false);
});

test("withStatus is immutable", () => {
  const a = base();
  const next = withStatus(a, "ASSIGNED");
  assert.equal(a.status, "OPEN");
  assert.equal(next.status, "ASSIGNED");
  assert.notEqual(a, next);
});
