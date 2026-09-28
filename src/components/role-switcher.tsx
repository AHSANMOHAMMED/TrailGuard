import { useState, useRef, useEffect } from "react";
import type { Permission } from "@/lib/domain/roles";
import { ROLES, ROLE_ORDER } from "@/lib/domain/roles";
import type { OfficerRole } from "@/lib/domain/enums";
import { useRole } from "@/lib/role-store";
import { cn } from "@/lib/utils";
import { ChevronDown, Check } from "lucide-react";

const ROLE_DOT: Record<string, string> = {
  RANGER: "bg-ok",
  MANAGER: "bg-accent",
  LIAISON: "bg-warn",
  RESEARCHER: "bg-muted",
};

/** Actor-mode switcher (demo RBAC — actors from the use case model). */
export function RoleSwitcher() {
  const { role, setRole } = useRole();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const profile = ROLES[role];

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex min-h-11 items-center gap-2 rounded-md border border-border px-3 text-xs"
      >
        <span className={cn("size-2 rounded-full", ROLE_DOT[role])} aria-hidden />
        <span className="hidden sm:inline text-muted">Acting as</span>
        <span className="font-medium">{profile?.name ?? role}</span>
        <ChevronDown className="size-3.5 text-muted" />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-30 mt-2 w-64 rounded-lg border border-border bg-surface p-1 shadow-xl"
        >
          <p className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-subtle">
            Use case actors
          </p>
          {ROLE_ORDER.map((r) => {
            const p = ROLES[r];
            const active = r === role;
            return (
              <button
                key={r}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  setRole(r as OfficerRole);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-start gap-2.5 rounded-md px-3 py-2.5 text-left transition-colors",
                  active ? "bg-elevated" : "hover:bg-elevated",
                )}
              >
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", ROLE_DOT[r])} aria-hidden />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{p.name}</span>
                  <span className="block truncate text-xs text-muted">{p.officerName}</span>
                  <span className="mt-0.5 block font-mono text-[10px] text-subtle">
                    {p.permissions.length} permissions
                  </span>
                </span>
                {active && <Check className="ml-auto mt-1 size-4 shrink-0 text-accent" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Permission gate: renders children only when the acting role allows it. */
export function Can({ perm, children, fallback = null }: {
  perm: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const allowed = useRole((s) => s.can(perm));
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
