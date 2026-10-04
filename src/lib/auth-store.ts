import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OfficerRole } from "@/lib/domain/enums";
import { useRole } from "@/lib/role-store";

/**
 * Role-based sign-in for the five wireframe actors. Fast by design: pick an
 * actor card, enter the 4-digit field PIN, and the session is on-device —
 * no network round-trip, mirroring the app's offline-first contract. The
 * permission matrix stays in `domain/roles.ts`; this store only decides which
 * use case areas a signed-in actor may open.
 */

export type ActorRole = OfficerRole | "COMMUNITY";

export type Area = "patrol" | "incidents" | "alerts" | "conflict" | "reports";

export interface ActorAccount {
  role: ActorRole;
  /** Actor name as in the use case model. */
  title: string;
  /** Demo persona shown after sign-in. */
  persona: string;
  /** 4-digit field PIN (demo credential, shown on the login screen). */
  pin: string;
  tagline: string;
  access: Area[];
}

/** Actor ↔ use case associations exactly as on the A01 use case diagram. */
export const ACTORS: ActorAccount[] = [
  {
    role: "RANGER",
    title: "Ranger",
    persona: "RN-402 Mercer",
    pin: "4021",
    tagline: "Patrols, field incidents, risk response",
    access: ["patrol", "incidents", "alerts", "conflict"],
  },
  {
    role: "LIAISON",
    title: "Community Liaison Officer",
    persona: "Liaison Fernando",
    pin: "7312",
    tagline: "Risk coordination, conflict responses",
    access: ["alerts", "conflict"],
  },
  {
    role: "MANAGER",
    title: "Park Manager",
    persona: "Mgr. Perera",
    pin: "8450",
    tagline: "Operations dashboard, reports",
    access: ["alerts", "reports"],
  },
  {
    role: "RESEARCHER",
    title: "Researcher",
    persona: "Dr. Jayawardena",
    pin: "5260",
    tagline: "Conservation reports and exports",
    access: ["reports"],
  },
  {
    role: "COMMUNITY",
    title: "Community Member",
    persona: "K. Bandara, Nagoda",
    pin: "1111",
    tagline: "Report wildlife conflict near the park",
    access: ["conflict"],
  },
];

export function actorFor(role: ActorRole): ActorAccount {
  const hit = ACTORS.find((a) => a.role === role);
  if (!hit) throw new Error(`Unknown actor role: ${role}`);
  return hit;
}

export interface Session {
  role: ActorRole;
  persona: string;
  title: string;
  signedInAt: string; // ISO
}

interface AuthState {
  session: Session | null;
  /** True once the persisted session has been read on this device. */
  hydrated: boolean;
  setHydrated: () => void;
  /** Validates the actor PIN; returns the session or null on a wrong PIN. */
  login: (role: ActorRole, pin: string) => Session | null;
  logout: () => void;
  canAccess: (area: Area) => boolean;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      login: (role, pin) => {
        const actor = actorFor(role);
        if (pin !== actor.pin) return null;
        const session: Session = {
          role,
          persona: actor.persona,
          title: actor.title,
          signedInAt: new Date().toISOString(),
        };
        set({ session });
        // Keep the legacy ops-desk acting role in step for officer roles.
        if (role !== "COMMUNITY") useRole.getState().setRole(role);
        return session;
      },
      logout: () => set({ session: null }),
      canAccess: (area) => {
        const s = get().session;
        return s !== null && actorFor(s.role).access.includes(area);
      },
    }),
    {
      name: "trailguard-session",
      partialize: (s) => ({ session: s.session }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
