import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useField, ROUTE_META } from "@/lib/store";
import { Can } from "@/components/role-switcher";
import { fmtTime } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { patrols, incidents, alerts, pendingCount, lastSyncAt, online } = useField();
  const pending = pendingCount();
  const active = patrols.find((p) => p.status === "ACTIVE");
  const openAlerts = alerts.filter((a) => a.status !== "CLOSED");

  return (
    <AppShell>
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted">Yala National Park</p>
      <h1 className="mt-1 text-3xl font-medium tracking-tight">Field desk</h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Offline-first records. Writes land on this device first. Nothing is marked submitted until
        sync acknowledgement.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Pending" value={String(pending)} hint={online ? "Ready to sync" : "Held offline"} />
        <Stat label="Patrols" value={String(patrols.length)} hint="All on device" />
        <Stat label="Incidents" value={String(incidents.length)} hint="Local + synced" />
        <Stat label="Open alerts" value={String(openAlerts.length)} hint="Conflict desk" />
      </div>

      <Card className="mt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Assigned route</CardTitle>
            <p className="mt-2 font-mono text-lg text-fg">{ROUTE_META.id}</p>
            <p className="text-sm text-muted">
              {ROUTE_META.name} · {ROUTE_META.sector}
            </p>
            <p className="mt-2 font-mono text-xs text-subtle">
              {ROUTE_META.distanceKm} km · {ROUTE_META.estTime} · +{ROUTE_META.gainM} m
            </p>
          </div>
          <Badge tone={active ? "ok" : "muted"}>{active ? "Active" : "Idle"}</Badge>
        </div>
        <div className="mt-4">
          <Can perm="patrol:start">
            <Button asChild className="w-full sm:w-auto">
              <Link to="/patrol">{active ? "Open active patrol" : "Start patrol"}</Link>
            </Button>
          </Can>
          <Can perm="report:generate">
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link to="/reports">Open reports</Link>
            </Button>
          </Can>
        </div>
      </Card>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Card>
          <CardTitle>Queue</CardTitle>
          <p className="mt-3 text-sm text-fg">{pending} records waiting for complete receipt</p>
          <p className="mt-1 text-xs text-muted">
            Last sync {lastSyncAt ? fmtTime(lastSyncAt) : "never"}
          </p>
        </Card>
        <Card>
          <CardTitle>Conflict</CardTitle>
          <p className="mt-3 text-sm text-fg">
            {openAlerts[0]
              ? `${openAlerts[0].animal} in ${openAlerts[0].zone}`
              : "No open risk alerts"}
          </p>
          <Button asChild variant="secondary" size="sm" className="mt-3">
            <Link to="/conflict">Open desk</Link>
          </Button>
        </Card>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="p-3">
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-mono text-2xl tabular-nums">{value}</p>
      <p className="text-[11px] text-subtle">{hint}</p>
    </Card>
  );
}
