import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ChevronRight, FileBarChart, Footprints, Lock, Map, Radio, Siren } from "lucide-react";
import { Body, Phone, Pill } from "@/components/field";
import { ConnectivityToggle } from "@/components/connectivity-toggle";
import { LoginScreen, SessionChip } from "@/components/auth-gate";
import { useAuth, type Area } from "@/lib/auth-store";
import { useField, ROUTE_META } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Home });

/**
 * Field application home — entry point to the four A01 use case flows
 * (UC01 Patrol · UC02 Field Incident · UC03 Risk Alerts · UC04 Conflict
 * Reports). Requires a signed-in actor; cards the actor is not associated
 * with are shown locked.
 */
function Home() {
  const { session, hydrated, canAccess } = useAuth();
  const { patrols, incidents, alerts, conflicts, pendingCount, online } = useField();

  if (!hydrated) return <Phone>{null}</Phone>;
  if (!session) return <LoginScreen />;

  const pending = pendingCount();
  const active = patrols.find((p) => p.status === "ACTIVE");
  const openAlert = alerts.find((a) => a.status !== "CLOSED");

  return (
    <Phone>
      <header className="flex items-center gap-2.5 px-4 pb-1 pt-5">
        <div>
          <p className="text-[17px] font-bold leading-tight tracking-tight">TrailGuard</p>
          <p className="text-[11px] text-muted">Yala National Park</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ConnectivityToggle />
          <SessionChip />
        </div>
      </header>
      <Body className="pt-3">
        {!online ? (
          <p className="rounded-lg border border-warn/40 bg-warn-bg px-3 py-2 text-[12px] font-semibold text-warn">
            Offline — new records are stored on this device and synchronize later.
          </p>
        ) : pending > 0 ? (
          <p className="rounded-lg border border-border bg-surface px-3 py-2 text-[12px] text-muted">
            {pending} record{pending === 1 ? "" : "s"} pending synchronisation.
          </p>
        ) : null}

        <UseCaseCard
          area="patrol"
          allowed={canAccess("patrol")}
          icon={<Map className="size-5" strokeWidth={2} />}
          title="Ranger Patrol"
          sub={`${ROUTE_META.name} · ${ROUTE_META.id} · ${ROUTE_META.distanceKm} km`}
          pill={
            active ? <Pill tone="progress">In Progress</Pill> : <Pill tone="muted">Assigned</Pill>
          }
        />
        <UseCaseCard
          area="incidents"
          allowed={canAccess("incidents")}
          icon={<Footprints className="size-5" strokeWidth={2} />}
          title="Report Field Incident"
          sub="Snare · carcass · campsite · footprints"
          pill={<Pill tone="muted">{incidents.length} on device</Pill>}
        />
        <UseCaseCard
          area="alerts"
          allowed={canAccess("alerts")}
          icon={<Siren className="size-5" strokeWidth={2} />}
          title="Wildlife Risk Alerts"
          sub={
            openAlert
              ? `${openAlert.animal} near ${openAlert.zone} · ${openAlert.collar}`
              : "No open risk alerts"
          }
          pill={openAlert ? <Pill tone="danger">High Risk</Pill> : <Pill tone="ok">Resolved</Pill>}
        />
        <UseCaseCard
          area="conflict"
          allowed={canAccess("conflict")}
          icon={<Radio className="size-5" strokeWidth={2} />}
          title="Community Conflict Report"
          sub="Elephant sighting · crop raiding · via app or SMS"
          pill={<Pill tone="muted">{conflicts.length} reported</Pill>}
        />

        <div className="mt-auto flex flex-col gap-2 pt-3">
          {canAccess("reports") ? (
            <Link
              to="/reports"
              className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-[13px] font-semibold text-muted hover:bg-elevated"
            >
              <FileBarChart className="size-4" strokeWidth={2} />
              Conservation reports (ops desk)
              <ChevronRight className="ml-auto size-4" />
            </Link>
          ) : null}
          <p className="text-center text-[11px] text-subtle">
            Offline-first · records stay on device until sync acknowledgement
          </p>
        </div>
      </Body>
    </Phone>
  );
}

const AREA_PATH: Record<Area, string> = {
  patrol: "/patrol",
  incidents: "/incidents",
  alerts: "/alerts",
  conflict: "/conflict",
  reports: "/reports",
  radio: "/radio",
};

function UseCaseCard({
  area,
  allowed,
  icon,
  title,
  sub,
  pill,
}: {
  area: Area;
  allowed: boolean;
  icon: ReactNode;
  title: string;
  sub: string;
  pill: ReactNode;
}) {
  const inner = (
    <>
      <span
        className={
          allowed
            ? "flex size-11 shrink-0 items-center justify-center rounded-xl bg-elevated text-accent"
            : "flex size-11 shrink-0 items-center justify-center rounded-xl bg-elevated text-subtle"
        }
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          {allowed ? pill : <Pill tone="muted">Not your role</Pill>}
        </span>
        <span className="mt-0.5 block text-[15px] font-bold leading-tight">{title}</span>
        <span className="block truncate text-[12px] text-muted">{sub}</span>
      </span>
      {allowed ? (
        <ChevronRight className="size-4 shrink-0 text-subtle" />
      ) : (
        <Lock className="size-4 shrink-0 text-subtle" strokeWidth={2} />
      )}
    </>
  );

  if (!allowed) {
    return (
      <div
        aria-disabled
        className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 opacity-60"
      >
        {inner}
      </div>
    );
  }
  return (
    <Link
      to={AREA_PATH[area]}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:bg-elevated"
    >
      {inner}
    </Link>
  );
}
