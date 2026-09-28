/**
 * TrailGuard domain enumerations.
 *
 * A02 R-03: the A01 class diagram referenced these as inline string unions
 * (`GPS|MANUAL`, `OPEN..CLOSED`) without ever declaring them. They are now
 * first-class, exported types — the single vocabulary every service speaks.
 */

/** Lifecycle of a locally-written field record: PENDING until the server acks. */
export type SyncState = "PENDING" | "SYNCED" | "FAILED";

/** Notification transport state. Deliberately distinct from acknowledgement. */
export type DeliveryState = "PENDING" | "SENT" | "FAILED";

export type PatrolStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

/**
 * Alert lifecycle. ESCALATED (R-02b) closes the A01 gap where an unassigned
 * alert had no modeled way out.
 */
export type AlertStatus = "OPEN" | "ASSIGNED" | "ESCALATED" | "CLOSED";

export type LocationSource = "GPS" | "MANUAL";

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export type IncidentCategory =
  | "SNARE"
  | "CROP_RAID"
  | "POACHING_SIGN"
  | "INJURED_ANIMAL"
  | "OTHER";

export type OfficerRole = "RANGER" | "LIAISON" | "MANAGER" | "RESEARCHER";

/** Category groups used by the capture UI (R-10: recognition over recall). */
export const CATEGORY_GROUPS: Record<string, IncidentCategory[]> = {
  Snares: ["SNARE", "POACHING_SIGN"],
  Animal: ["INJURED_ANIMAL", "CROP_RAID"],
  Other: ["OTHER"],
};

export const INCIDENT_CATEGORY_LABELS: Record<IncidentCategory, string> = {
  SNARE: "Snare",
  CROP_RAID: "Crop-raid",
  POACHING_SIGN: "Poaching sign",
  INJURED_ANIMAL: "Injured animal",
  OTHER: "Other",
};
