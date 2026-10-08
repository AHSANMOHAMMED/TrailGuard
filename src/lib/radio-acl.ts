import type { ActorRole } from "@/lib/auth-store";
import type { RadioChannelId } from "@/lib/store";

/**
 * Channel ACL for Field Radio. Staff (ranger / liaison / manager / researcher)
 * may use the full VHF plan; community members are limited to the Community
 * channel so village traffic stays on CMN-3.
 */

export const STAFF_CHANNELS: RadioChannelId[] = ["OPS-1", "EMG-7", "CMN-3"];
export const COMMUNITY_CHANNELS: RadioChannelId[] = ["CMN-3"];

export function channelsFor(role: ActorRole | null | undefined): RadioChannelId[] {
  if (!role) return STAFF_CHANNELS;
  return role === "COMMUNITY" ? COMMUNITY_CHANNELS : STAFF_CHANNELS;
}

export function canTransmitOn(
  role: ActorRole | null | undefined,
  channel: RadioChannelId,
): boolean {
  return channelsFor(role).includes(channel);
}

/** Default channel when an actor opens the radio. */
export function defaultChannel(role: ActorRole | null | undefined): RadioChannelId {
  if (role === "COMMUNITY" || role === "LIAISON") return "CMN-3";
  if (role === "MANAGER" || role === "RANGER") return "OPS-1";
  return "CMN-3";
}

/** Map auth actor role → RadioMessage.fromRole for the log. */
export function radioFromRole(
  role: ActorRole | null | undefined,
): "RANGER" | "LIAISON" | "MANAGER" {
  if (role === "LIAISON") return "LIAISON";
  if (role === "MANAGER" || role === "RESEARCHER") return "MANAGER";
  return "RANGER";
}
