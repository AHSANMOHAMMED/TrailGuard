import type { ReactNode } from "react";
import type { Permission } from "@/lib/domain/roles";
import { can } from "@/lib/domain/roles";
import { useAuth } from "@/lib/auth-store";

/*
 * Session-driven permission gate.
 *
 * The signed-in actor (PIN sign-in) is the single source of truth: `Can`
 * checks the signed-in role against the domain permission matrix. There is
 * deliberately no actor switcher — the actor is fixed at sign-in, so a
 * Researcher session can never act as a Ranger and vice versa.
 */

/** Renders children only when the signed-in actor holds the permission. */
export function Can({
  perm,
  children,
  fallback = null,
}: {
  perm: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const role = useAuth((s) => s.session?.role);
  const allowed = role ? can(role, perm) : false;
  return <>{allowed ? children : fallback}</>;
}

/** Inline denial note with the reason tied to the use case model. */
export function DeniedNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-elevated px-3 py-2.5 text-xs text-muted">
      <span className="font-mono text-[10px] uppercase tracking-wider text-subtle block mb-0.5">
        Not your role
      </span>
      {children}
    </div>
  );
}
