import type { OfficerRole } from "./enums";

/**
 * Role-based access control (A02: actors as first-class users).
 *
 * The matrix mirrors the improved use case diagram's actor associations
 * exactly — each actor can do what their use case model allows, nothing
 * more. Roles here are *acting modes* of the demo (the assignment excludes
 * login/logout as a graded goal), not authenticated accounts.
 */

export type Permission =
  // UC01 patrol
  | "patrol:start"
  | "patrol:waypoint"
  | "patrol:finish"
  | "patrol:sync"
  | "patrol:retry"
  // UC02 incidents
  | "incident:create"
  | "incident:camera-review"
  // UC03 conflict
  | "conflict:ingest"
  | "conflict:assign"
  | "conflict:acknowledge"
  | "conflict:escalate"
  | "conflict:close"
  // UC04 reports
  | "report:generate"
  | "report:export";

export interface RoleProfile {
  role: OfficerRole;
  name: string;
  /** Display persona used by the role switcher. */
  officerName: string;
  permissions: Permission[];
}

const RANGER: RoleProfile = {
  role: "RANGER",
  name: "Ranger",
  officerName: "RN-402 Mercer",
  permissions: [
    "patrol:start",
    "patrol:waypoint",
    "patrol:finish",
    "patrol:sync",
    "patrol:retry",
    "incident:create",
    "conflict:acknowledge",
  ],
};

const MANAGER: RoleProfile = {
  role: "MANAGER",
  name: "Park Manager",
  officerName: "Mgr perera",
  permissions: [
    "patrol:sync",
    "patrol:retry",
    "incident:camera-review",
    "conflict:ingest",
    "conflict:assign",
    "conflict:escalate",
    "report:generate",
    "report:export",
  ],
};

const LIAISON: RoleProfile = {
  role: "LIAISON",
  name: "Liaison Officer",
  officerName: "Liaison Fernando",
  permissions: ["conflict:acknowledge", "conflict:close", "conflict:escalate"],
};

const RESEARCHER: RoleProfile = {
  role: "RESEARCHER",
  name: "Researcher",
  officerName: "Dr. Jayawardena",
  permissions: ["report:generate", "report:export"],
};

export const ROLES: Record<string, RoleProfile> = {
  RANGER: RANGER,
  MANAGER: MANAGER,
  LIAISON: LIAISON,
  RESEARCHER: RESEARCHER,
};

export const ROLE_ORDER = ["RANGER", "MANAGER", "LIAISON", "RESEARCHER"] as const;

export function can(role: OfficerRole | string, permission: Permission): boolean {
  return ROLES[role]?.permissions.includes(permission) ?? false;
}

export function profileFor(role: OfficerRole | string): RoleProfile | undefined {
  return ROLES[role];
}
