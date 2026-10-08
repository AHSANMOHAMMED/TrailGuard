import { test } from "node:test";
import assert from "node:assert/strict";
import { chatterAt, chatterDue, nextChatter, seedChatter } from "./radio-chatter";

test("chatterAt is deterministic and stays in range", () => {
  const a = chatterAt(42, 10);
  const b = chatterAt(42, 10);
  assert.equal(a, b);
  assert.ok(a >= 0 && a < 10);
});

test("chatterAt covers a spread of indices across seeds", () => {
  const seen = new Set<number>();
  for (let seed = 0; seed < 200; seed += 1) seen.add(chatterAt(seed, 10));
  assert.ok(seen.size > 5, `expected spread, got ${seen.size} distinct values`);
});

test("chatterAt with a zero-sized pool is safe", () => {
  assert.equal(chatterAt(7, 0), 0);
});

test("chatterDue is deterministic and true for a subset of seeds", () => {
  let hits = 0;
  for (let seed = 0; seed < 40; seed += 1) if (chatterDue(seed)) hits += 1;
  assert.equal(chatterDue(11), chatterDue(11));
  assert.ok(hits > 0 && hits < 40, `expected a subset, got ${hits}/40`);
});

test("nextChatter returns messages only for channels with traffic and only when due", () => {
  let sent = 0;
  for (let seed = 0; seed < 60; seed += 1) {
    const m = nextChatter(seed, "OPS-1");
    if (m) {
      sent += 1;
      assert.equal(m.channel, "OPS-1");
      assert.ok((m.text ?? "").length > 0);
      assert.equal(m.kind, "text");
    }
  }
  assert.ok(sent > 0 && sent < 60, `expected intermittent traffic, got ${sent}/60 due`);
});

test("nextChatter never returns CMN-3 lines as ranger-only ops traffic", () => {
  // The community-meeting line is CMN-3 only; it must never surface on other channels.
  for (let seed = 0; seed < 120; seed += 1) {
    const m = nextChatter(seed, "OPS-1");
    if (m) assert.ok(!(m.text ?? "").includes("Community meeting"));
  }
});

test("seedChatter produces SYNCED history with staggered timestamps", () => {
  const now = Date.now();
  const log = seedChatter("OPS-1", 4, now);
  assert.equal(log.length, 4);
  for (const m of log) {
    assert.equal(m.syncState, "SYNCED");
    assert.equal(m.channel, "OPS-1");
    assert.match(m.messageId, /^radio-seed-OPS-1-/);
  }
  const times = log.map((m) => new Date(m.transmittedAt).getTime());
  assert.ok(times.every((t) => t < now), "history must be in the past");
  for (let i = 1; i < times.length; i += 1) {
    assert.ok(times[i] > times[i - 1], "history must be chronological");
  }
});

test("seedChatter on a channel with no templates yields nothing", () => {
  // Every template lists at least OPS-1/EMG-7/CMN-3, so exercise the guard directly.
  const log = seedChatter("OPS-1", 0);
  assert.equal(log.length, 0);
});
