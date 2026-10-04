import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, FileBarChart, Footprints, Map, Radio, Siren } from "lucide-react";
import { Body, Phone, Pill } from "@/components/field";
import { ConnectivityToggle } from "@/components/connectivity-toggle";
import { useField, ROUTE_META } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Home });

/**
 * Field application home — entry point to the four A01 use case flows
 * (UC01 Patrol · UC02 Field Incident · UC03 Risk Alerts · UC04 Conflict
 * Reports), styled with the wireframes' design system.
 */
function Home() {
  const { patrols, incidents, alerts, conflicts, pendingCount, online } = useField();
  const pending = pendingCount();
  const active = patrols.find((p) => p.status === "ACTIVE");
  const openAlert = alerts.find((a) => a.status !== "CLOSED");

  return (
    <Phone>
      <header className="flex items-center gap-2.5 px-4 pb-1 pt-5">
        <Mark />
        <div>
          <p className="text-[17px] font-bold leading-tight tracking-tight">TrailGuard</p>
          <p className="text-[11px] text-muted">Yala National Park · Field App</p>
        </div>
        <div className="ml-auto">
          <ConnectivityToggle labelled />
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
          to="/patrol"
          code="UC01"
          icon={<Map className="size-5" strokeWidth={2} />}
          title="Ranger Patrol"
          sub={`${ROUTE_META.name} · ${ROUTE_META.id} · ${ROUTE_META.distanceKm} km`}
          pill={
            active ? <Pill tone="progress">In Progress</Pill> : <Pill tone="muted">Assigned</Pill>
          }
        />
        <UseCaseCard
          to="/incidents"
          code="UC02"
          icon={<Footprints className="size-5" strokeWidth={2} />}
          title="Report Field Incident"
          sub="Snare · carcass · campsite · footprints"
          pill={<Pill tone="muted">{incidents.length} on device</Pill>}
        />
        <UseCaseCard
          to="/alerts"
          code="UC03"
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
          to="/conflict"
          code="UC04"
          icon={<Radio className="size-5" strokeWidth={2} />}
          title="Community Conflict Report"
          sub="Elephant sighting · crop raiding · via app or SMS"
          pill={<Pill tone="muted">{conflicts.length} reported</Pill>}
        />

        <div className="mt-auto flex flex-col gap-2 pt-3">
          <Link
            to="/reports"
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-[13px] font-semibold text-muted hover:bg-elevated"
          >
            <FileBarChart className="size-4" strokeWidth={2} />
            Conservation reports (ops desk)
            <ChevronRight className="ml-auto size-4" />
          </Link>
          <p className="text-center text-[11px] text-subtle">
            Offline-first · records stay on device until sync acknowledgement
          </p>
        </div>
      </Body>
    </Phone>
  );
}

function UseCaseCard({
  to,
  code,
  icon,
  title,
  sub,
  pill,
}: {
  to: string;
  code: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  pill: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 transition-colors hover:bg-elevated"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-elevated text-accent">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-subtle">{code}</span>
          {pill}
        </span>
        <span className="mt-0.5 block text-[15px] font-bold leading-tight">{title}</span>
        <span className="block truncate text-[12px] text-muted">{sub}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-subtle" />
    </Link>
  );
}

function Mark() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
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
