/** UC04 demo helpers for community conflict reporting (Kajana). */

export const SMS_SHORT_CODE = "7444";

export type ConflictChannel = "Mobile App" | "SMS";

export function isHighPriorityConflict(type: string): boolean {
  return type === "Elephant Sighting";
}

export function conflictChannelHint(channel: ConflictChannel): string {
  if (channel === "SMS") {
    return `Text type, location and description to short code ${SMS_SHORT_CODE}.`;
  }
  return "Fill in the report on this device — both channels reach wildlife staff.";
}

export function conflictAckLabel(
  syncState: "PENDING" | "FAILED" | "SYNCED",
  wasOffline: boolean,
): string {
  if (syncState !== "SYNCED") return "Pending sync";
  return wasOffline ? "Synchronised" : "Submitted";
}

export function conflictPatternNote(type: string, count: number): string | null {
  if (count < 2) return null;
  return `${count} reports of ${type} near the park boundary — review together to identify a trend.`;
}
