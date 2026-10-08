import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Delete,
  FlaskConical,
  Handshake,
  Home,
  LockKeyhole,
  LogOut,
  ShieldCheck,
  TreePine,
  UsersRound,
} from "lucide-react";
import { Body, BtnPrimary, Phone, Pill } from "@/components/field";
import {
  ACTORS,
  actorFor,
  useAuth,
  type ActorAccount,
  type ActorRole,
  type Area,
} from "@/lib/auth-store";
import { cn } from "@/lib/utils";

/*
 * Sign-in and access control for the five wireframe actors, in the same
 * design system as the use case screens (50–52 px touch targets, every
 * state a text label + icon).
 */

const AREA_LABEL: Record<Area, string> = {
  patrol: "Ranger Patrol",
  incidents: "Field Incidents",
  alerts: "Wildlife Risk Alerts",
  conflict: "Conflict Reports",
  reports: "Conservation Reports",
  radio: "Field Radio",
};

const ACTOR_ICON: Record<ActorRole, typeof ShieldCheck> = {
  RANGER: ShieldCheck,
  LIAISON: Handshake,
  MANAGER: TreePine,
  RESEARCHER: FlaskConical,
  COMMUNITY: UsersRound,
};

/**
 * Wraps a route: unauthenticated → sign-in screen; authenticated but not an
 * associated actor for this use case → access-restricted screen.
 */
export function Guard({ area, children }: { area: Area; children: ReactNode }) {
  const { session, hydrated, canAccess } = useAuth();

  if (!hydrated) {
    return (
      <Phone>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6">
          <p className="text-[17px] font-bold tracking-tight text-accent">TrailGuard</p>
          <p className="text-[12px] text-muted">Loading field session…</p>
        </div>
      </Phone>
    );
  }
  if (!session) return <LoginScreen />;
  if (!canAccess(area)) return <AccessDenied area={area} />;
  return <>{children}</>;
}

export function LoginScreen() {
  const login = useAuth((s) => s.login);
  const lockedUntil = useAuth((s) => s.lockedUntil);
  const [picked, setPicked] = useState<ActorAccount | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Live countdown while the brute-force lockout is active.
  useEffect(() => {
    if (!lockedUntil) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [lockedUntil]);
  const lockLeftS = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0;

  function enter(digit: string) {
    if (!picked || lockLeftS > 0) return;
    setError(false);
    const next = (pin + digit).slice(0, 4);
    setPin(next);
    if (next.length === 4) {
      if (login(picked.role, next)) return; // Guard re-renders into the app
      setError(true);
      setPin("");
    }
  }

  return (
    <Phone>
      <Body className="pt-8">
        <div className="flex flex-col items-center gap-1 pb-2 text-center">
          <Mark />
          <h1 className="text-[22px] font-bold tracking-tight">TrailGuard</h1>
          <p className="text-[12.5px] text-muted">Yala National Park · Sign in to your role</p>
        </div>

        {!picked ? (
          <>
            <p className="text-[13px] font-semibold">Who is using this device?</p>
            {ACTORS.map((a) => {
              const Icon = ACTOR_ICON[a.role];
              return (
                <button
                  key={a.role}
                  type="button"
                  onClick={() => {
                    setPicked(a);
                    setPin("");
                    setError(false);
                  }}
                  className="flex min-h-[64px] w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:bg-elevated"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-elevated text-accent">
                    <Icon className="size-5" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-bold leading-tight">{a.title}</span>
                    <span className="block truncate text-[12px] text-muted">{a.tagline}</span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-subtle" />
                </button>
              );
            })}
            <p className="mt-auto pt-2 text-center text-[11px] text-subtle">
              On-device sign-in — works fully offline. Demo PINs are shown for the evaluation.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
              <span className="flex size-11 items-center justify-center rounded-xl bg-elevated text-accent">
                {(() => {
                  const Icon = ACTOR_ICON[picked.role];
                  return <Icon className="size-5" strokeWidth={2} />;
                })()}
              </span>
              <span className="flex-1">
                <span className="block text-[15px] font-bold leading-tight">{picked.title}</span>
                <span className="block text-[12px] text-muted">{picked.persona}</span>
              </span>
              <button
                type="button"
                onClick={() => setPicked(null)}
                className="text-[12px] font-semibold text-accent underline-offset-2 hover:underline"
              >
                Change
              </button>
            </div>

            <p className="pt-1 text-center text-[13px] font-semibold">
              Enter your 4-digit field PIN
            </p>
            <div
              className="flex justify-center gap-2.5"
              role="status"
              aria-label={`${pin.length} of 4 digits entered`}
            >
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "size-3.5 rounded-full border-2",
                    i < pin.length ? "border-accent bg-accent" : "border-[#c6d2c6] bg-surface",
                    error && "border-danger",
                  )}
                />
              ))}
            </div>
            {error || lockLeftS > 0 ? (
              <p
                className={cn(
                  "flex items-center justify-center gap-1.5 text-[12.5px] font-semibold",
                  lockLeftS > 0 ? "text-warn" : "text-danger",
                )}
              >
                <LockKeyhole className="size-3.5" />
                {lockLeftS > 0
                  ? `Too many attempts · locked for ${lockLeftS}s`
                  : "Wrong PIN — try again"}
              </p>
            ) : (
              <p className="text-center text-[11.5px] text-subtle">
                Enter the 4-digit PIN issued to your officer ID
              </p>
            )}

            <div className="mx-auto grid w-full max-w-[260px] grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((key, i) =>
                key === "" ? (
                  <span key={i} />
                ) : key === "⌫" ? (
                  <button
                    key={i}
                    type="button"
                    aria-label="Delete digit"
                    disabled={lockLeftS > 0}
                    onClick={() => setPin((p) => p.slice(0, -1))}
                    className="flex h-[52px] items-center justify-center rounded-xl border border-border bg-surface text-muted hover:bg-elevated disabled:opacity-50"
                  >
                    <Delete className="size-5" strokeWidth={2} />
                  </button>
                ) : (
                  <button
                    key={i}
                    type="button"
                    disabled={lockLeftS > 0}
                    onClick={() => enter(key)}
                    className="h-[52px] rounded-xl border border-border bg-surface text-[18px] font-semibold hover:bg-elevated disabled:opacity-50"
                  >
                    {key}
                  </button>
                ),
              )}
            </div>
          </>
        )}
      </Body>
    </Phone>
  );
}

function AccessDenied({ area }: { area: Area }) {
  const { session, logout } = useAuth();
  const allowed = ACTORS.filter((a) => a.access.includes(area));

  return (
    <Phone>
      <Body className="pt-10">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-elevated">
          <LockKeyhole className="size-7 text-muted" strokeWidth={2} />
        </div>
        <div className="text-center">
          <Pill tone="muted">Access restricted</Pill>
          <h2 className="mt-2 text-[18px] font-bold">{AREA_LABEL[area]}</h2>
          <p className="mt-1 text-[13px] text-muted">
            {session ? `${session.title} is not an actor of this use case.` : ""}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-[12px] font-semibold text-muted">Associated actors</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {allowed.map((a) => (
              <span
                key={a.role}
                className="rounded-full bg-elevated px-2.5 py-1 text-[12px] font-semibold"
              >
                {a.title}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-auto flex flex-col gap-2 pt-2">
          <BtnPrimary onClick={logout}>Switch account</BtnPrimary>
          <Link
            to="/"
            className="flex h-[50px] w-full items-center justify-center gap-2 rounded-xl border border-[#c6d2c6] bg-surface text-[15px] font-semibold hover:bg-elevated"
          >
            <Home className="size-4" strokeWidth={2} /> Back to Home
          </Link>
        </div>
      </Body>
    </Phone>
  );
}

/** Signed-in chip for the home header: persona, role, sign out. */
export function SessionChip() {
  const { session, logout } = useAuth();
  if (!session) return null;
  const actor = actorFor(session.role);
  const Icon = ACTOR_ICON[actor.role];
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface py-1 pl-1.5 pr-2.5">
        <span className="flex size-6 items-center justify-center rounded-full bg-elevated text-accent">
          <Icon className="size-3.5" strokeWidth={2} />
        </span>
        <span className="text-[11px] font-semibold leading-none">
          {session.persona}
          <span className="block pt-0.5 text-[9px] font-normal uppercase tracking-wide text-muted">
            {session.title}
          </span>
        </span>
      </span>
      <button
        type="button"
        onClick={logout}
        aria-label="Sign out"
        title="Sign out"
        className="flex size-9 items-center justify-center rounded-full border border-border bg-surface text-muted hover:bg-elevated hover:text-fg"
      >
        <LogOut className="size-4" strokeWidth={2} />
      </button>
    </div>
  );
}

function Mark() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3 4.5 6.5v5.2c0 4.7 3.2 8.7 7.5 10.3 4.3-1.6 7.5-5.6 7.5-10.3V6.5L12 3Z"
        stroke="#1f5a43"
        strokeWidth="1.6"
        fill="#e7f2ea"
      />
      <path d="M8 13.5c2.2-1.6 3.4-1.6 8-3" stroke="#1f5a43" strokeWidth="1.6" />
    </svg>
  );
}
