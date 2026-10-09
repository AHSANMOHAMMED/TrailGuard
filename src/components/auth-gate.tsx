import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
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
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ACTORS,
  accessFor,
  actorFor,
  useAuth,
  type ActorRole,
  type Area,
} from "@/lib/auth-store";
import { cn } from "@/lib/utils";

/*
 * Sign-in and access control for field actors. Role pick happens only on
 * LoginScreen — onboarding is a feature tour (see /onboarding).
 */

const AREA_LABEL: Record<Area, string> = {
  patrol: "Ranger Patrol",
  incidents: "Field Incidents",
  alerts: "Wildlife Risk Alerts",
  conflict: "Conflict Reports",
  reports: "Conservation Reports",
  radio: "Field Radio",
  admin: "Role Admin",
};

const ACTOR_ICON: Record<ActorRole, typeof ShieldCheck> = {
  SUPER_ADMIN: LockKeyhole,
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
  const auth = useAuth();
  const { session, hydrated, canAccess } = auth;

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
  const signIn = useAuth((s) => s.signIn);
  const lockedUntil = useAuth((s) => s.lockedUntil);
  const [userId, setUserId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!lockedUntil) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [lockedUntil]);
  const lockLeftS = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0;

  function submit(e?: { preventDefault(): void }) {
    e?.preventDefault();
    if (lockLeftS > 0) return;
    setError(false);
    if (!signIn(userId, pin)) {
      setError(true);
      setPin("");
    }
  }

  return (
    <Phone>
      <div className="relative overflow-hidden bg-[#163c2c] text-center text-white">
        <div className="absolute right-3 top-3 z-20">
          <ThemeToggle tone="dark" />
        </div>
        <div className="relative aspect-[16/10] w-full overflow-hidden">
          <img
            src="/brand/trailguard-logo.jpg"
            alt="TrailGuard Forest"
            className="size-full object-cover object-center brightness-90"
            width={780}
            height={440}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-[#163c2c]/40 to-[#163c2c]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 pt-2">
            <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-[#a0dfb8] uppercase drop-shadow-sm">
              FIELD OPS FOR THE WILD
            </span>
            <h1 className="mt-1 text-[26px] font-extrabold tracking-tight text-white drop-shadow-md">
              TRAILGUARD
            </h1>
          </div>
        </div>
        <div className="relative -mt-6 pb-6 px-4">
          <h2 className="text-[22px] font-bold tracking-tight text-white drop-shadow">
            TrailGuard
          </h2>
          <p className="mt-0.5 text-[12.5px] text-white/85">
            Yala National Park · Field sign-in
          </p>
        </div>
        {/* Wave separator */}
        <div className="h-4 w-full bg-surface [clip-path:ellipse(60%_100%_at_50%_100%)]" />
      </div>

      <Body className="tg-fade-up pt-3">
        <form className="flex flex-col gap-3.5" onSubmit={submit}>
          <div>
            <h3 className="text-[17px] font-bold">Login</h3>
            <p className="mt-0.5 text-[13px] text-muted">
              Enter your user ID and 4-digit field PIN.
            </p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-semibold text-muted">User ID</span>
            <input
              type="text"
              name="userId"
              autoComplete="username"
              value={userId}
              disabled={lockLeftS > 0}
              onChange={(ev) => {
                setUserId(ev.target.value);
                setError(false);
              }}
              placeholder="e.g. RN-402"
              className="h-[52px] w-full rounded-2xl border border-border bg-surface px-4 text-[15px] text-fg shadow-sm outline-none ring-accent/40 placeholder:text-subtle focus:ring-2 disabled:opacity-50"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12.5px] font-semibold text-muted">Field PIN</span>
            <input
              type="password"
              name="pin"
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={4}
              value={pin}
              disabled={lockLeftS > 0}
              onChange={(ev) => {
                setPin(ev.target.value.replace(/\D/g, "").slice(0, 4));
                setError(false);
              }}
              placeholder="••••"
              className="h-[52px] w-full rounded-2xl border border-border bg-surface px-4 text-[16px] tracking-[0.4em] text-fg shadow-sm outline-none ring-accent/40 placeholder:tracking-normal placeholder:text-subtle focus:ring-2 disabled:opacity-50"
            />
          </label>

          {error || lockLeftS > 0 ? (
            <p
              className={cn(
                "flex items-center gap-1.5 rounded-xl border border-danger/30 bg-danger-bg/50 px-3 py-2 text-[12.5px] font-semibold",
                lockLeftS > 0 ? "text-warn" : "text-danger",
              )}
            >
              <LockKeyhole className="size-4 shrink-0" />
              {lockLeftS > 0
                ? `Too many attempts · locked for ${lockLeftS}s`
                : "Wrong user ID or PIN — try again"}
            </p>
          ) : null}

          <BtnPrimary
            type="submit"
            disabled={lockLeftS > 0 || !userId.trim() || pin.length < 4}
          >
            Sign in
          </BtnPrimary>
        </form>

        <p className="mt-auto pt-4 text-center text-[11px] text-subtle">
          Protected field authentication · offline verified
        </p>
      </Body>
    </Phone>
  );
}

function AccessDenied({ area }: { area: Area }) {
  const { session, logout, roleAccess } = useAuth();
  const allowed = ACTORS.filter((a) => accessFor(a.role, roleAccess).includes(area));

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
            {session
              ? `${session.title} is not associated with this use case on the A01 diagram.`
              : ""}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-[12px] font-semibold text-muted">Actors who can open this</p>
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
export function SessionChip({ tone = "light" }: { tone?: "light" | "dark" }) {
  const { session, logout } = useAuth();
  if (!session) return null;
  const actor = actorFor(session.role);
  const Icon = ACTOR_ICON[actor.role];
  const onDark = tone === "dark";
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "flex items-center gap-1.5 rounded-full border py-1 pl-1.5 pr-2.5",
          onDark
            ? "border-white/30 bg-white/15 text-white"
            : "border-border bg-surface",
        )}
      >
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full",
            onDark ? "bg-white/20 text-white" : "bg-elevated text-accent",
          )}
        >
          <Icon className="size-3.5" strokeWidth={2} />
        </span>
        <span className="text-[11px] font-semibold leading-none">
          {session.persona}
          <span
            className={cn(
              "block pt-0.5 text-[9px] font-normal uppercase tracking-wide",
              onDark ? "text-white/70" : "text-muted",
            )}
          >
            {session.title}
          </span>
        </span>
      </span>
      <button
        type="button"
        onClick={logout}
        aria-label="Sign out"
        title="Sign out"
        className={cn(
          "flex size-9 items-center justify-center rounded-full border",
          onDark
            ? "border-white/30 bg-white/15 text-white hover:bg-white/25"
            : "border-border bg-surface text-muted hover:bg-elevated hover:text-fg",
        )}
      >
        <LogOut className="size-4" strokeWidth={2} />
      </button>
    </div>
  );
}
