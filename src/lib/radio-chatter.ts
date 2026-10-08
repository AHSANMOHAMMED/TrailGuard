import type { RadioMessage } from "@/lib/types";

/**
 * Simulated over-the-air chatter from the rest of the field team.
 *
 * Real radios are a shared medium: the channel carries traffic from every
 * logged-in unit, not just this device. During a demonstration the network
 * feed replays that property — other officers transmit on the same
 * frequencies, arriving with realistic operational phrasing. The generator
 * is pure (a seed fixes the pick) so unit tests can assert its behaviour;
 * the receiver timestamps messages with the current clock.
 */

export interface ChatterTemplate {
  /** The transmission text as spoken on channel. */
  text: string;
  /** Which role the sender holds — the log derives the sender title from it. */
  fromRole: RadioMessage["fromRole"];
  fromTitle: string;
  /** Channels this line plausibly belongs to. */
  channels: Array<RadioMessage["channel"]>;
}

const ROSTER = {
  RANGER: "Ranger Silva · NB-02",
  LIAISON: "Liaison Rajapaksa · CLO-01",
  MANAGER: "Ops Desk · Park Control",
} as const satisfies Record<RadioMessage["fromRole"], string>;

const CHATTER: readonly ChatterTemplate[] = [
  {
    text: "NB-02 checkpoint complete, footprint trail heading east along the fence line.",
    fromRole: "RANGER",
    fromTitle: ROSTER.RANGER,
    channels: ["OPS-1"],
  },
  {
    text: "Copy that, NB-02. Logging the sighting for the evening report.",
    fromRole: "MANAGER",
    fromTitle: ROSTER.MANAGER,
    channels: ["OPS-1"],
  },
  {
    text: "Villagers report crop damage near the canal bund, requesting a patrol drive-by.",
    fromRole: "LIAISON",
    fromTitle: ROSTER.LIAISON,
    channels: ["CMN-3", "OPS-1"],
  },
  {
    text: "EL-07 collar pings inside the buffer zone — keeping an eye on the approach.",
    fromRole: "MANAGER",
    fromTitle: ROSTER.MANAGER,
    channels: ["EMG-7", "OPS-1"],
  },
  {
    text: "Section 3 water hole clear, moving to the ridge post.",
    fromRole: "RANGER",
    fromTitle: ROSTER.RANGER,
    channels: ["OPS-1"],
  },
  {
    text: "Standing by at the school evacuation point, roads are quiet.",
    fromRole: "LIAISON",
    fromTitle: ROSTER.LIAISON,
    channels: ["EMG-7", "CMN-3"],
  },
  {
    text: "All units: routine check-in due on the hour, report by exception.",
    fromRole: "MANAGER",
    fromTitle: ROSTER.MANAGER,
    channels: ["OPS-1", "EMG-7"],
  },
  {
    text: "Poaching snare recovered at grid reference K-14, photo going up with the incident report.",
    fromRole: "RANGER",
    fromTitle: ROSTER.RANGER,
    channels: ["OPS-1", "EMG-7"],
  },
  {
    text: "Community meeting scheduled for six, will relay any new sightings afterwards.",
    fromRole: "LIAISON",
    fromTitle: ROSTER.LIAISON,
    channels: ["CMN-3"],
  },
  {
    text: "Weather turning — advising all posts to secure loose gear before dark.",
    fromRole: "MANAGER",
    fromTitle: ROSTER.MANAGER,
    channels: ["OPS-1", "EMG-7", "CMN-3"],
  },
] as const;

/**
 * Deterministic pseudo-random pick from `0` (inclusive) to `max` (exclusive).
 * A xorshift-style bit mix spreads consecutive seeds across the whole range
 * so the feed traverses the script instead of repeating one line.
 */
export function chatterAt(seed: number, max: number): number {
  if (max <= 0) return 0;
  let x = (seed + 0x9e37_79b9) | 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x21f0_aaad) | 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x735a_2d97) | 0;
  x ^= x >>> 15;
  return ((x >>> 0) % max + max) % max;
}

/** True when the feed should emit on this tick (roughly one tick in four). */
export function chatterDue(seed: number): boolean {
  return chatterAt(seed, 4) === 1;
}

/**
 * The next incoming transmission for `channel`, or `null` when nothing
 * arrives this tick. The same `seed` always yields the same transmission —
 * tests stay deterministic, the caller varies the seed per tick.
 */
export function nextChatter(seed: number, channel: RadioMessage["channel"]): Omit<RadioMessage, "messageId" | "transmittedAt" | "syncState"> | null {
  const candidates = CHATTER.filter((c) => c.channels.includes(channel));
  if (candidates.length === 0 || !chatterDue(seed)) return null;
  const pick = candidates[chatterAt(seed, candidates.length)];
  return { channel, fromRole: pick.fromRole, fromTitle: pick.fromTitle, kind: "text", text: pick.text };
}

/** Historic chatter used to backfill a channel log before the feed starts. */
export function seedChatter(channel: RadioMessage["channel"], count: number, now = Date.now()): RadioMessage[] {
  const candidates = CHATTER.filter((c) => c.channels.includes(channel));
  const out: RadioMessage[] = [];
  if (candidates.length === 0) return out;
  // Walk the candidate list from a seeded offset so a backfilled log never
  // repeats a line within its own window — real channel traffic doesn't either.
  const start = chatterAt(now, candidates.length);
  for (let i = 0; i < count; i += 1) {
    const pick = candidates[(start + i) % candidates.length];
    out.push({
      messageId: `radio-seed-${channel}-${i}`,
      channel,
      fromRole: pick.fromRole,
      fromTitle: pick.fromTitle,
      kind: "text",
      text: pick.text,
      // Stagger the history across the previous half hour, newest last.
      transmittedAt: new Date(now - (count - i) * 5 * 60_000).toISOString(),
      syncState: "SYNCED",
    });
  }
  return out;
}
