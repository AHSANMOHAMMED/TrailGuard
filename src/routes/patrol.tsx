import { createFileRoute } from "@tanstack/react-router";
import { AppShell, SyncBadge } from "@/components/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useField, ROUTE_META } from "@/lib/store";
import { Can, DeniedNote } from "@/components/role-switcher";
import { fmtClock } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/patrol")({ component: PatrolPage });

function PatrolPage() {
  const { patrols, startPatrol, addWaypoint, undoWaypoint, finishPatrol, online } = useField();
  const active = patrols.find((p) => p.status === "ACTIVE");
  const latest = patrols[0];

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">UC01</p>
        {/* R-09: connectivity visible at the point of action */}
        <Badge tone={online ? "ok" : "warn"}>
          {online ? "ONLINE" : "OFFLINE — QUEUED LOCALLY"}
        </Badge>
      </div>
      <h1 className="mt-1 text-3xl font-medium tracking-tight">Patrol</h1>
      <p className="mt-2 text-sm text-muted">
        Start assigned route, log GPS or manual waypoints, finish locally, then sync one record.
      </p>

      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <CardTitle>Mission profile</CardTitle>
          <Badge tone={active ? "ok" : "muted"}>{active ? "Active" : "Standby"}</Badge>
        </div>
        <p className="mt-3 font-mono text-xl">{ROUTE_META.id}</p>
        <p className="text-sm text-muted">
          {ROUTE_META.name} · {ROUTE_META.sector}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Metric k="Distance" v={`${ROUTE_META.distanceKm} km`} />
          <Metric k="Est. time" v={ROUTE_META.estTime} />
          <Metric k="Gain" v={`+${ROUTE_META.gainM} m`} />
        </div>
      </Card>

      <Card className="mt-3">
        <CardTitle>Pre-patrol checks</CardTitle>
        <ul className="mt-3 space-y-2 text-sm">
          <Check ok label="Ranger authorized" value="RN-402 Mercer" />
          <Check ok label="Offline vector map" value="Park_Sector_04.vmap" />
          <Check ok label="Device storage" value="14.2 GB free" />
          <Check ok={false} warn label="Connectivity" value="Field mode allowed" />
        </ul>
      </Card>

      <Card className="mt-3 overflow-hidden p-0">
        <div className="px-4 pt-4">
          <CardTitle>Track</CardTitle>
        </div>
        <TrailMap points={active?.waypoints ?? latest?.waypoints ?? []} />
        <p className="px-4 pb-3 font-mono text-[11px] text-subtle">
          {(active ?? latest)?.waypoints.length ?? 0} waypoints · source GPS / MANUAL
        </p>
      </Card>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {!active ? (
          <Can
            perm="patrol:start"
            fallback={
              <DeniedNote>
                Starting a patrol is a Ranger action — switch roles in the header.
              </DeniedNote>
            }
          >
            <Button
              className="flex-1"
              onClick={() => {
                const p = startPatrol();
                toast.message(`Patrol started ${p.patrolId.slice(0, 8)}`);
              }}
            >
              Start patrol
            </Button>
          </Can>
        ) : (
          <Can
            perm="patrol:waypoint"
            fallback={<DeniedNote>Recording waypoints is a Ranger action.</DeniedNote>}
          >
            <>
              <Button variant="secondary" className="flex-1" onClick={() => addWaypoint("GPS")}>
                GPS waypoint
              </Button>
              <Button
                variant="secondary"
                className="flex-1 min-h-16 text-base"
                onClick={() => {
                  addWaypoint("MANUAL");
                  // R-10: easy reversal — undo toast for manual marks
                  toast.message("Manual mark saved", {
                    action: { label: "Undo", onClick: () => undoWaypoint() },
                  });
                }}
              >
                Manual mark
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  const p = finishPatrol();
                  toast.message(`Completed · PENDING ${p?.waypoints.length ?? 0} points`);
                }}
              >
                Finish
              </Button>
            </>
          </Can>
        )}
      </div>

      <h2 className="mt-8 text-sm font-medium text-muted">On device</h2>
      <ul className="mt-3 space-y-2">
        {patrols.slice(0, 6).map((p) => (
          <li key={p.patrolId} className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-3">
            <div>
              <p className="font-mono text-sm">
                {p.status} · {p.waypoints.length} pts
              </p>
              <p className="text-xs text-muted">{fmtClock(p.startedAt)}</p>
            </div>
            <SyncBadge state={p.syncState} />
          </li>
        ))}
      </ul>
    </AppShell>
  );
}

function Metric({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md bg-elevated px-3 py-2">
      <p className="font-mono text-[10px] uppercase text-subtle">{k}</p>
      <p className="font-mono text-sm">{v}</p>
    </div>
  );
}

function Check({ ok, warn, label, value }: { ok: boolean; warn?: boolean; label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-fg">{label}</span>
      <span className={warn ? "font-mono text-xs text-warn" : "font-mono text-xs text-ok"}>
        {ok || warn ? value : value}
      </span>
    </li>
  );
}

function TrailMap({ points }: { points: { lat: number; lng: number }[] }) {
  const w = 640;
  const h = 180;
  const path =
    points.length > 1
      ? points
          .map((p, i) => {
            const x = 24 + (i / Math.max(points.length - 1, 1)) * (w - 48);
            const y = h - 36 - ((p.lat - 6.4) / 0.04) * 80;
            return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${Math.min(h - 20, Math.max(20, y)).toFixed(1)}`;
          })
          .join(" ")
      : "";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-40 w-full text-accent" aria-label="Patrol track">
      <rect x="0" y="0" width={w} height={h} fill="transparent" />
      <path d="M0 140 Q160 100 320 120 T640 90" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="8" />
      {path && <path d={path} fill="none" stroke="currentColor" strokeWidth="2.5" />}
      {points.map((p, i) => {
        const x = 24 + (i / Math.max(points.length - 1, 1)) * (w - 48);
        const y = h - 36 - ((p.lat - 6.4) / 0.04) * 80;
        return <circle key={i} cx={x} cy={Math.min(h - 20, Math.max(20, y))} r="3.5" fill="currentColor" />;
      })}
    </svg>
  );
}
