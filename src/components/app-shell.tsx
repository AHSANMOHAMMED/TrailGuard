import type { ReactNode } from "react";
import { useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Map, Shield, Siren, FileBarChart, Radio, RadioTower, CloudOff, Cloud } from "lucide-react";
import { useField } from "@/lib/store";
import { can, type Permission } from "@/lib/domain/roles";
import { useAuth } from "@/lib/auth-store";
import { SessionChip } from "@/components/auth-gate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn, fmtTime } from "@/lib/utils";

const NAV: {
  to: string;
  label: string;
  icon: typeof Map;
  exact?: boolean;
  always?: boolean;
  perm?: Permission;
}[] = [
  { to: "/", label: "Ops", icon: Shield, exact: true, always: true },
  { to: "/patrol", label: "Patrol", icon: Map, perm: "patrol:start" },
  { to: "/incidents", label: "Incidents", icon: Radio, perm: "incident:create" },
  { to: "/conflict", label: "Conflict", icon: Siren, perm: "conflict:acknowledge" },
  { to: "/radio", label: "Radio", icon: RadioTower, perm: "radio:transmit" },
  { to: "/reports", label: "Reports", icon: FileBarChart, perm: "report:generate" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { online, setOnline, lastSyncAt, syncing, synchronize, pendingCount } = useField();
  const session = useAuth((s) => s.session);
  // The signed-in actor is the single source of truth for what this shell shows.
  const role = session?.role ?? null;
  const may = (p: Permission) => (role ? can(role, p) : false);
  const pending = pendingCount();
  const visibleNav = NAV.filter((item) => item.always || (item.perm && may(item.perm)));

  useEffect(() => {
    void useField.persist.rehydrate();
  }, []);

  async function onSync() {
    try {
      const r = await synchronize();
      toast.success(
        r.radio > 0
          ? `Synced ${r.patrols} patrols, ${r.incidents} incidents, ${r.radio} radio transmissions`
          : `Synced ${r.patrols} patrols, ${r.incidents} incidents`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sync failed");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg md:flex-row">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-surface md:flex md:flex-col">
        <div className="flex items-center gap-2 px-5 py-5">
          <BrandLogo className="size-8 rounded-lg" />
          <div>
            <div className="text-sm font-semibold tracking-tight">TrailGuard</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted">Field ops</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {visibleNav.map((item) => {
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-md px-3 text-sm transition-colors duration-150",
                  active ? "bg-elevated text-fg" : "text-muted hover:bg-elevated hover:text-fg",
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <p className="px-5 py-4 font-mono text-[10px] text-subtle">Yala · NB-03</p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-bg/90 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2 md:hidden">
            <BrandLogo className="size-7 rounded-md" />
            <span className="text-sm font-semibold">TrailGuard</span>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
              Last sync {lastSyncAt ? fmtTime(lastSyncAt) : "never"}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <SessionChip />
            <button
              type="button"
              onClick={() => setOnline(!online)}
              className="flex min-h-11 items-center gap-1.5 rounded-md border border-border px-3 text-xs text-muted"
            >
              {online ? <Cloud className="size-3.5" /> : <CloudOff className="size-3.5" />}
              {online ? "Online" : "Offline"}
            </button>
            <Button
              size="sm"
              variant={pending ? "warn" : "secondary"}
              onClick={onSync}
              disabled={syncing || !may("patrol:sync")}
              title={may("patrol:sync") ? undefined : "Sync is a ranger/manager action"}
            >
              {syncing ? "Syncing…" : pending ? `Sync ${pending}` : "Sync"}
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 pb-24 md:pb-8">{children}</main>

        <nav className={cn(
          "fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur-sm md:hidden",
          `grid-cols-${visibleNav.length}`,
        )}>
          {visibleNav.map((item) => {
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[10px] uppercase tracking-wide",
                  active ? "text-accent" : "text-muted",
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src="/brand/trailguard-logo.jpg"
      alt=""
      className={cn("object-cover", className)}
      width={32}
      height={32}
    />
  );
}

export function SyncBadge({ state }: { state: "PENDING" | "SYNCED" | "FAILED" }) {
  if (state === "PENDING") return <Badge tone="warn">Pending</Badge>;
  if (state === "FAILED") return <Badge tone="danger">Failed</Badge>;
  return <Badge tone="ok">Synced</Badge>;
}
