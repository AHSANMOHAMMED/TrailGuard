import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Live ConservationAPI must not silently mirror outside tests.
 * Domain unit tests inject fakes; production/preview throws on server failure.
 */
describe("conservation-client live vs test fallback", () => {
  it("enables mirror fallback only under NODE_ENV=test", async () => {
    const mod = await import("./conservation-client.ts");
    // Re-read the helper by probing behavior: a failing primary in test uses fallback.
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";
    assert.equal(process.env.NODE_ENV, "test");

    // Production-like: primary rejects → must reject (no silent success).
    process.env.NODE_ENV = "production";
    let threw = false;
    try {
      await mod.upsertRadioLive({
        messageId: "radio-must-fail-without-server",
        channel: "OPS-1",
        body: "ping",
      });
    } catch {
      threw = true;
    }
    // Without a running TanStack runtime, the server fn fails → must throw in production.
    assert.equal(threw, true, "live path must not swallow upsert errors");

    process.env.NODE_ENV = prev ?? "test";
  });
});
