import type { ActorRole, Area } from "@/lib/auth-store";
import { DEFAULT_ACCESS } from "@/lib/auth-store";

/**
 * Actor ↔ use-case capabilities for TrailGuard (A01 diagram + A02 desk rules).
 *
 * | Actor        | UC01 Patrol | UC02 Incident | UC03 Alerts | UC04 Conflict | Reports |
 * |--------------|-------------|---------------|-------------|---------------|---------|
 * | Ranger       | field       | field         | respond     | staff respond | —       |
 * | Liaison      | —           | —             | respond     | staff respond | —       |
 * | Manager      | —           | —             | assign desk | ops overview  | yes     |
 * | Researcher   | —           | —             | —           | —             | yes     |
 * | Community    | —           | —             | —           | submit only   | —       |
 * | Super Admin  | all         | all           | all         | all           | all     |
 */

/** Areas each role may open (same source as DEFAULT_ACCESS). */
export function areasFor(role: ActorRole): Area[] {
  return DEFAULT_ACCESS[role] ?? [];
}

/** Community member submits conflict reports; staff review/respond. */
export function isConflictSubmitter(role: ActorRole | null | undefined): boolean {
  return role === "COMMUNITY" || role === "SUPER_ADMIN";
}

/** Ranger / Liaison / Manager / Super Admin operate the conflict desk. */
export function isConflictStaff(role: ActorRole | null | undefined): boolean {
  return (
    role === "RANGER" ||
    role === "LIAISON" ||
    role === "MANAGER" ||
    role === "SUPER_ADMIN"
  );
}

/** Field officers who acknowledge and resolve wildlife risk alerts. */
export function isAlertResponder(role: ActorRole | null | undefined): boolean {
  return role === "RANGER" || role === "LIAISON" || role === "SUPER_ADMIN";
}

/** Park Manager (and Super Admin) run the assign / escalate desk. */
export function isAlertAssigner(role: ActorRole | null | undefined): boolean {
  return role === "MANAGER" || role === "SUPER_ADMIN";
}

/** Sync uploads pending field records — most field actors including Community. */
export function canSyncField(role: ActorRole | null | undefined): boolean {
  return (
    role === "RANGER" ||
    role === "LIAISON" ||
    role === "MANAGER" ||
    role === "SUPER_ADMIN" ||
    role === "COMMUNITY"
  );
}

/** Pull DB / Neon desk hydrate — Manager ops + Super Admin only. */
export function canSeePullDb(role: ActorRole | null | undefined): boolean {
  return role === "SUPER_ADMIN" || role === "MANAGER";
}

/** Short label of what this actor should do after sign-in. */
export function actorMission(role: ActorRole): string {
  switch (role) {
    case "RANGER":
      return "Your work: patrols, field incidents, risk response, conflict desk";
    case "LIAISON":
      return "Your work: risk coordination and community conflict responses";
    case "MANAGER":
      return "Your work: assign risk alerts, review ops, conservation reports";
    case "RESEARCHER":
      return "Your work: conservation reports and exports (synced data only)";
    case "COMMUNITY":
      return "Your work: report wildlife conflict near the park (app or SMS)";
    case "SUPER_ADMIN":
      return "Your work: all field areas + divide roles for every actor";
    default:
      return "Field operations";
  }
}

/** Home card order — only areas this role may open. */
export const HOME_AREA_ORDER: Area[] = [
  "patrol",
  "incidents",
  "alerts",
  "conflict",
  "radio",
  "reports",
  "admin",
];

export function homeAreasFor(role: ActorRole, access: Area[]): Area[] {
  return HOME_AREA_ORDER.filter((a) => access.includes(a));
}
