import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  ChevronRight,
  FileBarChart,
  Footprints,
  Map,
  Radio,
  RadioTower,
  RefreshCw,
  Shield,
  Siren,
} from "lucide-react";
import { Body, Phone, Pill } from "@/components/field";
import { ConnectivityToggle } from "@/components/connectivity-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginScreen, SessionChip } from "@/components/auth-gate";
import { useAuth, type Area } from "@/lib/auth-store";
import {
  actorMission,
  canSeePullDb,
  canSyncField,
  homeAreasFor,
} from "@/lib/actor-capabilities";
import { useField, ROUTE_META } from "@/lib/store";
import { fmtTime } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

/**
 * Field application home — only the signed-in actor's use cases are listed
 * (A01 associations). Locked areas are hidden so each role sees a complete
 * workspace for their job, not a wall of "Not your role" cards.
 */
function Home() {
  const auth = useAuth();
  const { session, hydrated, canAccess } = auth;
  const {
    patrols,
    incidents,
    alerts,
    conflicts,
    pendingCount,
    online,
    syncing,
    lastSyncAt,
    synchronize,
    pullSharedFromDb,
  } = useField();
  const [syncNote, setSyncNote] = useState<string | null>(null);

  if (!hydrated) {
    return (
      <Phone>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
          <img
            src="/brand/trailguard-logo.jpg"
            alt=""
            className="size-16 rounded-2xl object-cover shadow-sm ring-1 ring-border"
            width={64}
            height={64}
          />
          <p className="text-[17px] font-bold tracking-tight text-accent">TrailGuard</p>
          <p className="text-[12px] text-muted">Loading field session…</p>
        </div>
      </Phone>
    );
  }
  if (!session) return <LoginScreen />;

  const pending = pendingCount();
  const active = patrols.find((p) => p.status === "ACTIVE");
  const openAlert = alerts.find((a) => a.status !== "CLOSED");
  const myAreas = homeAreasFor(
    session.role,
    (["patrol", "incidents", "alerts", "conflict", "radio", "reports", "admin"] as Area[]).filter(
      (a) => canAccess(a),
    ),
  );

  async function onSync() {
    if (!online) {
      setSyncNote("Offline — Sync waits until connectivity returns.");
      return;
    }
    setSyncNote(null);
    try {
      const result = await synchronize();
      const n = result.patrols + result.incidents + result.radio;
      let pullExtra = "";
      try {
        const pulled = await pullSharedFromDb();
        const p =
          pulled.patrols +
          pulled.incidents +
          pulled.conflicts +
          pulled.alerts +
          pulled.radio;
        pullExtra = p > 0 ? ` Desk refreshed (${p} shared).` : "";
      } catch {
        /* upload still succeeded */
      }
      setSyncNote(
        n === 0
          ? `Nothing pending — queue already clear.${pullExtra}`
          : `Synced ${n} record${n === 1 ? "" : "s"}.${pullExtra}`,
      );
    } catch {
      setSyncNote("Offline — records stay PENDING on this phone.");
    }
  }

  async function onPullShared() {
    if (!online) {
      setSyncNote("Offline — cannot refresh shared field data.");
      return;
    }
    try {
      const pulled = await pullSharedFromDb();
      setSyncNote(
        `Refreshed shared data — P${pulled.patrols} I${pulled.incidents} C${pulled.conflicts}`,
      );
    } catch {
      setSyncNote("Could not refresh shared field data.");
    }
  }

  const showSync = canSyncField(session.role);
  const showPull = canSeePullDb(session.role);

  return (
    <Phone>
      <div className="tg-wave-hero px-4 pb-10 pt-5">
        <div className="flex items-start gap-2.5">
          <div>
            <p className="text-[18px] font-bold leading-tight tracking-tight text-white">TrailGuard</p>
            <p className="text-[12px] text-white/75">Yala National Park</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle tone="dark" />
            <ConnectivityToggle tone="dark" />
            <SessionChip tone="dark" />
          </div>
        </div>
      </div>
      <Body className="tg-fade-up -mt-3 pt-1">
        {showSync ? (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 shadow-sm">
            <button
              type="button"
              onClick={() => void onSync()}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-fg shadow-sm disabled:opacity-60"
            >
              <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} strokeWidth={2} />
              Sync{pending > 0 ? ` (${pending})` : ""}
            </button>
            {showPull ? (
              <button
                type="button"
                onClick={() => void onPullShared()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-elevated px-3 py-1.5 text-[12px] font-semibold text-fg"
              >
                Refresh shared
              </button>
            ) : null}
            <div className="min-w-0 flex-1 text-[11px] text-muted">
              {lastSyncAt ? (
                <p className="truncate">Last sync {fmtTime(lastSyncAt)}</p>
              ) : (
                <p>No sync yet</p>
              )}
              {pending > 0 ? (
                <p className="font-semibold text-warn">{pending} pending on this phone</p>
              ) : (
                <p>Queue clear</p>
              )}
            </div>
          </div>
        ) : null}
        {syncNote ? (
          <p
            className={`rounded-lg border px-3 py-2 text-[12px] font-semibold ${
              online
                ? "border-border bg-surface text-muted"
                : "border-warn/40 bg-warn-bg text-warn"
            }`}
          >
            {syncNote}
          </p>
        ) : !online ? (
          <p className="rounded-lg border border-warn/40 bg-warn-bg px-3 py-2 text-[12px] font-semibold text-warn">
            Offline — new records stay PENDING until Sync acknowledges them.
          </p>
        ) : null}

        <div className="rounded-xl border border-accent/20 bg-ok-bg/60 px-3 py-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-accent">
            {session.title}
          </p>
          <p className="mt-0.5 text-[12.5px] leading-snug text-muted">
            {actorMission(session.role)}
          </p>
        </div>

        {myAreas.includes("patrol") ? (
          <UseCaseCard
            area="patrol"
            icon={<Map className="size-5" strokeWidth={2} />}
            title="Ranger Patrol"
            sub={`${ROUTE_META.name} · ${ROUTE_META.id} · ${ROUTE_META.distanceKm} km`}
            pill={
              active ? <Pill tone="progress">In Progress</Pill> : <Pill tone="muted">Assigned</Pill>
            }
          />
        ) : null}
        {myAreas.includes("incidents") ? (
          <UseCaseCard
            area="incidents"
            icon={<Footprints className="size-5" strokeWidth={2} />}
            title="Report Field Incident"
            sub="Snare · carcass · campsite · footprints"
            pill={<Pill tone="muted">{incidents.length} on device</Pill>}
          />
        ) : null}
        {myAreas.includes("alerts") ? (
          <UseCaseCard
            area="alerts"
            icon={<Siren className="size-5" strokeWidth={2} />}
            title={
              session.role === "MANAGER"
                ? "Assign Risk Alerts"
                : "Wildlife Risk Alerts"
            }
            sub={
              session.role === "MANAGER"
                ? openAlert
                  ? `Open: ${openAlert.animal} · ${openAlert.zone} — assign / escalate`
                  : "Assign officers · escalate if no ack"
                : openAlert
                  ? `${openAlert.animal} near ${openAlert.zone} · ${openAlert.collar}`
                  : "No open risk alerts"
            }
            pill={
              openAlert ? (
                <Pill tone="danger">
                  {session.role === "MANAGER" ? "ASSIGN" : "HIGH RISK"}
                </Pill>
              ) : (
                <Pill tone="ok">Resolved</Pill>
              )
            }
          />
        ) : null}
        {myAreas.includes("conflict") ? (
          <UseCaseCard
            area="conflict"
            icon={<Radio className="size-5" strokeWidth={2} />}
            title={
              session.role === "COMMUNITY"
                ? "Report Wildlife Conflict"
                : "Community Conflict Desk"
            }
            sub={
              session.role === "COMMUNITY"
                ? "Elephant sighting · crop raiding · via app or SMS"
                : "Review reports · record responses"
            }
            pill={<Pill tone="muted">{conflicts.length} reported</Pill>}
          />
        ) : null}
        {myAreas.includes("radio") ? (
          <UseCaseCard
            area="radio"
            icon={<RadioTower className="size-5" strokeWidth={2} />}
            title="Field Radio"
            sub={
              session.role === "COMMUNITY"
                ? "Community channel CMN-3 only"
                : "Push-to-talk · OPS / EMG / CMN"
            }
            pill={<Pill tone="muted">Radio</Pill>}
          />
        ) : null}
        {myAreas.includes("reports") ? (
          <UseCaseCard
            area="reports"
            icon={<FileBarChart className="size-5" strokeWidth={2} />}
            title={
              session.role === "RESEARCHER"
                ? "Research Snapshot & Export"
                : "Conservation Reports"
            }
            sub={
              session.role === "RESEARCHER"
                ? "Synced counts · coverage · CSV for analysis"
                : "Ops coverage · conflict totals · CSV export"
            }
            pill={
              <Pill tone="muted">
                {session.role === "RESEARCHER" ? "Research" : "Ops desk"}
              </Pill>
            }
          />
        ) : null}
        {myAreas.includes("admin") ? (
          <UseCaseCard
            area="admin"
            icon={<Shield className="size-5" strokeWidth={2} />}
            title="Role Admin"
            sub="Create and divide areas for every field actor"
            pill={<Pill tone="progress">Super Admin</Pill>}
          />
        ) : null}

        <div className="mt-auto flex flex-col gap-2 pt-3">
          <p className="text-center text-[11px] text-subtle">
            Offline-first field ops · Yala National Park
          </p>
        </div>
      </Body>
    </Phone>
  );
}

const AREA_PATH: Record<Area, "/patrol" | "/incidents" | "/alerts" | "/conflict" | "/reports" | "/radio" | "/admin"> = {
  patrol: "/patrol",
  incidents: "/incidents",
  alerts: "/alerts",
  conflict: "/conflict",
  reports: "/reports",
  radio: "/radio",
  admin: "/admin",
};

function UseCaseCard({
  area,
  icon,
  title,
  sub,
  pill,
}: {
  area: Area;
  icon: ReactNode;
  title: string;
  sub: string;
  pill: ReactNode;
}) {
  return (
    <Link
      to={AREA_PATH[area]}
      className="tg-card-lift flex items-center gap-3 rounded-xl border border-border bg-surface p-3.5 hover:bg-elevated"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-elevated text-accent">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">{pill}</span>
        <span className="mt-0.5 block text-[15px] font-bold leading-tight">{title}</span>
        <span className="block truncate text-[12px] text-muted">{sub}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-subtle" />
    </Link>
  );
}
