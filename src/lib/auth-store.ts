import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OfficerRole } from "@/lib/domain/enums";

/**
 * Credential sign-in: each actor has a user ID + 4-digit field PIN.
 * Session is on-device (offline-first). Permission matrix stays in
 * `domain/roles.ts`; this store decides which areas the signed-in actor may open.
 */

export type ActorRole = OfficerRole | "COMMUNITY" | "SUPER_ADMIN";

export type Area =
  | "patrol"
  | "incidents"
  | "alerts"
  | "conflict"
  | "reports"
  | "radio"
  | "admin";

const ALL_FIELD: Area[] = [
  "patrol",
  "incidents",
  "alerts",
  "conflict",
  "reports",
  "radio",
  "admin",
];

export interface ActorAccount {
  role: ActorRole;
  /** Actor name as in the use case model. */
  title: string;
  /** Demo persona shown after sign-in. */
  persona: string;
  /** Login user ID typed on the sign-in form (not listed as a picker). */
  userId: string;
  /** 4-digit field PIN (password). */
  pin: string;
  tagline: string;
  access: Area[];
}

/**
 * Default role matrix (A01 use-case associations + A02 desk).
 * Super Admin can override access at runtime on `/admin`.
 *
 * Ranger — UC01/02 field + UC03 respond + UC04 staff desk
 * Liaison — UC03 respond + UC04 staff desk
 * Manager — UC03 assign desk + UC04 ops overview + reports
 * Researcher — reports only (+ radio listen/talk for demo)
 * Community — UC04 submit only (+ CMN radio)
 */
export const DEFAULT_ACCESS: Record<ActorRole, Area[]> = {
  SUPER_ADMIN: ALL_FIELD,
  RANGER: ["patrol", "incidents", "alerts", "conflict", "radio"],
  LIAISON: ["alerts", "conflict", "radio"],
  MANAGER: ["alerts", "conflict", "reports", "radio"],
  RESEARCHER: ["reports", "radio"],
  COMMUNITY: ["conflict", "radio"],
};

/** Actor ↔ use case associations exactly as on the A01 use case diagram. */
export const ACTORS: ActorAccount[] = [
  {
    role: "SUPER_ADMIN",
    title: "Super Admin",
    persona: "Park Systems Admin",
    userId: "admin",
    pin: "9999",
    tagline: "Create and divide roles for all field actors",
    access: ALL_FIELD,
  },
  {
    role: "RANGER",
    title: "Ranger",
    persona: "RN-402 Mercer",
    userId: "RN-402",
    pin: "4021",
    tagline: "Patrols, field incidents, risk response",
    access: DEFAULT_ACCESS.RANGER,
  },
  {
    role: "LIAISON",
    title: "Community Liaison Officer",
    persona: "Liaison Fernando",
    userId: "liaison",
    pin: "7312",
    tagline: "Risk coordination, conflict responses",
    access: DEFAULT_ACCESS.LIAISON,
  },
  {
    role: "MANAGER",
    title: "Park Manager",
    persona: "Mgr. Perera",
    userId: "manager",
    pin: "8450",
    tagline: "Operations dashboard, reports",
    access: DEFAULT_ACCESS.MANAGER,
  },
  {
    role: "RESEARCHER",
    title: "Researcher",
    persona: "Dr. Jayawardena",
    userId: "researcher",
    pin: "5260",
    tagline: "Conservation reports and exports",
    access: DEFAULT_ACCESS.RESEARCHER,
  },
  {
    role: "COMMUNITY",
    title: "Community Member",
    persona: "K. Bandara, Nagoda",
    userId: "community",
    pin: "1111",
    tagline: "Report wildlife conflict near the park",
    access: DEFAULT_ACCESS.COMMUNITY,
  },
];

export function actorFor(role: ActorRole): ActorAccount {
  const hit = ACTORS.find((a) => a.role === role);
  if (!hit) throw new Error(`Unknown actor role: ${role}`);
  return hit;
}

/** Resolve typed login credentials → actor role, or null if invalid. */
export function resolveLogin(userIdRaw: string, pinRaw: string): ActorRole | null {
  const userId = userIdRaw.trim().toLowerCase();
  const pin = pinRaw.trim();
  if (!userId || pin.length !== 4) return null;
  const hit = ACTORS.find((a) => {
    const aliases = [
      a.userId.toLowerCase(),
      a.role.toLowerCase(),
      a.title.toLowerCase().replace(/\s+/g, ""),
    ];
    return aliases.includes(userId) && a.pin === pin;
  });
  return hit?.role ?? null;
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
  /** Consecutive failed PIN attempts (in-memory; resets on success). */
  failedAttempts: number;
  /** Epoch ms until which sign-in is locked after repeated failures. */
  lockedUntil: number | null;
  /** Super Admin overrides of role → areas (offline-capable). */
  roleAccess: Partial<Record<ActorRole, Area[]>>;
  /** First-run onboarding completed on this device. */
  onboardingDone: boolean;
  /** Bump when the feature tour changes so old devices re-run onboarding. */
  onboardingVersion: number;
  setHydrated: () => void;
  /** Validates role + PIN (internal). Prefer {@link signIn} from the login form. */
  login: (role: ActorRole, pin: string) => Session | null;
  /** User ID + PIN credential sign-in. */
  signIn: (userId: string, pin: string) => Session | null;
  logout: () => void;
  canAccess: (area: Area) => boolean;
  setRoleAccess: (role: ActorRole, access: Area[]) => void;
  completeOnboarding: () => void;
}

/** Feature-tour content version — increment to force the new onboarding. */
export const ONBOARDING_VERSION = 2;

export function accessFor(role: ActorRole, overrides: Partial<Record<ActorRole, Area[]>>): Area[] {
  return overrides[role] ?? DEFAULT_ACCESS[role] ?? [];
}

/** True until the current feature-tour version has been completed. */
export function needsOnboarding(s: {
  onboardingDone: boolean;
  onboardingVersion: number;
}): boolean {
  return !s.onboardingDone || s.onboardingVersion !== ONBOARDING_VERSION;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      session: null,
      hydrated: false,
      failedAttempts: 0,
      lockedUntil: null,
      roleAccess: {},
      onboardingDone: false,
      onboardingVersion: 0,
      setHydrated: () => set({ hydrated: true }),
      login: (role, pin) => {
        // Brute-force guard: five wrong attempts lock sign-in for 60 s.
        const lockedUntil = get().lockedUntil;
        if (lockedUntil && lockedUntil > Date.now()) return null;
        const actor = actorFor(role);
        if (pin !== actor.pin) {
          const failedAttempts = get().failedAttempts + 1;
          set({
            failedAttempts,
            lockedUntil: failedAttempts >= 5 ? Date.now() + 60_000 : lockedUntil,
          });
          return null;
        }
        const session: Session = {
          role,
          persona: actor.persona,
          title: actor.title,
          signedInAt: new Date().toISOString(),
        };
        set({ session, failedAttempts: 0, lockedUntil: null });
        return session;
      },
      signIn: (userId, pin) => {
        const lockedUntil = get().lockedUntil;
        if (lockedUntil && lockedUntil > Date.now()) return null;
        const role = resolveLogin(userId, pin);
        if (!role) {
          const failedAttempts = get().failedAttempts + 1;
          set({
            failedAttempts,
            lockedUntil: failedAttempts >= 5 ? Date.now() + 60_000 : lockedUntil,
          });
          return null;
        }
        return get().login(role, pin.trim());
      },
      logout: () => set({ session: null }),
      canAccess: (area) => {
        const s = get().session;
        if (!s) return false;
        return accessFor(s.role, get().roleAccess).includes(area);
      },
      setRoleAccess: (role, access) => {
        if (role === "SUPER_ADMIN") return; // cannot lock out super admin
        set({ roleAccess: { ...get().roleAccess, [role]: access } });
      },
      completeOnboarding: () =>
        set({ onboardingDone: true, onboardingVersion: ONBOARDING_VERSION }),
    }),
    {
      name: "trailguard-session-v2",
      partialize: (s) => ({
        session: s.session,
        roleAccess: s.roleAccess,
        onboardingDone: s.onboardingDone,
        onboardingVersion: s.onboardingVersion,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // Drop stale tour completion from the previous onboarding copy.
        if (state.onboardingVersion !== ONBOARDING_VERSION) {
          state.onboardingDone = false;
          state.onboardingVersion = 0;
        }
        // Clear any leftover v1 key so role-picker onboarding cannot linger.
        try {
          localStorage.removeItem("trailguard-session");
        } catch {
          /* ignore */
        }
        state.setHydrated();
      },
    },
  ),
);
