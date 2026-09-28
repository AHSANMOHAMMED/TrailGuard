import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OfficerRole } from "@/lib/domain/enums";
import { ROLES, can, type Permission } from "@/lib/domain/roles";

/**
 * Acting-role state (A02 actor-goal demo modes). This is NOT authentication —
 * the assignment excludes login/logout; it is the use case model's actor
 * selection made tangible, persisted per device like the field data.
 */
interface RoleState {
  role: OfficerRole;
  setRole: (r: OfficerRole) => void;
  /** Does the acting role hold this permission? */
  can: (p: Permission) => boolean;
}

export const useRole = create<RoleState>()(
  persist(
    (set, get) => ({
      role: "RANGER",
      setRole: (role) => set({ role }),
      can: (p) => can(get().role, p),
    }),
    { name: "trailguard-role" },
  ),
);

export function roleProfile(role: OfficerRole) {
  return ROLES[role];
}
