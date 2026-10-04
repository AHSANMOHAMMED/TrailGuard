import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, Info } from "lucide-react";
import {
  Body,
  BtnOutline,
  BtnPrimary,
  Card,
  ConfirmNote,
  GpsActive,
  HintCard,
  OfflineBanner,
  OnlineBanner,
  Phone,
  Pill,
  Row,
  RouteMap,
  ScreenHeader,
  SuccessCheck,
  Tile,
} from "@/components/field";
import { ConnectivityToggle } from "@/components/connectivity-toggle";
import { Guard } from "@/components/auth-gate";
import { useField, ROUTE_META } from "@/lib/store";
import { fmtClock } from "@/lib/utils";

export const Route = createFileRoute("/patrol")({
  component: () => (
    <Guard area="patrol">
      <PatrolPage />
    </Guard>
  ),
});

/**
 * UC01-S01 — Conduct Assigned Ranger Patrol.
 * Screens follow the hi-fi wireframe panels 1–8 (Figure 6):
 * assigned → in progress (GPS) → manual waypoint (A1) → offline (A2) →
 * sync restore (A3) → complete confirm → completion summary.
 */

const COVER_AT = 110; // positions needed for full route coverage (demo pace)

type Phase = "assigned" | "progress" | "waypoint" | "done";

function PatrolPage() {
  const router = useRouter();
  const { online, startPatrol, addWaypoint, finishPatrol } = useField();

  const [phase, setPhase] = useState<Phase>("assigned");
  const [positions, setPositions] = useState(0);
  const [pendingSync, setPendingSync] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [elapsedS, setElapsedS] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [waypointSaved, setWaypointSaved] = useState(false);
  const [syncingBack, setSyncingBack] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [completed, setCompleted] = useState<{
    at: string;
    positions: number;
    coverage: number;
    durationS: number;
  } | null>(null);

  const progress = Math.min(1, positions / COVER_AT);
  const covered = progress >= 0.96;
  const coveragePct = Math.min(96, Math.round(progress * 100));

  // GPS tick: one PatrolPosition per interval while the patrol is running.
  const running = phase === "progress" || phase === "waypoint";
  const onlineRef = useRef(online);
  onlineRef.current = online;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setPositions((n) => (n >= COVER_AT ? n : n + 1));
      setElapsedS((s) => s + 1);
      if (!onlineRef.current) setPendingSync((n) => n + 1);
    }, 700);
    return () => clearInterval(t);
  }, [running]);

  // A3 — connectivity restored: drain the pending queue, confirm, no re-entry.
  // The ref keeps the pending count out of the dependency list on purpose:
  // the drain must start when connectivity returns, not re-arm on every tick.
  const pendingRef = useRef(pendingSync);
  pendingRef.current = pendingSync;
  useEffect(() => {
    if (!online || !running || pendingRef.current === 0) return;
    setSyncingBack(true);
    const t = setInterval(() => {
      setPendingSync((n) => {
        if (n <= 1) {
          clearInterval(t);
          setSyncingBack(false);
          setJustSynced(true);
          setTimeout(() => setJustSynced(false), 4000);
          return 0;
        }
        return Math.max(0, n - Math.ceil(n / 3));
      });
    }, 350);
    return () => clearInterval(t);
  }, [online, running]);

  function onStart() {
    startPatrol();
    setStartedAt(new Date().toISOString());
    setPositions(1);
    setElapsedS(0);
    setPhase("progress");
  }

  function onSaveWaypoint() {
    addWaypoint("MANUAL");
    setPositions((n) => n + 1);
    setWaypointSaved(true);
    setTimeout(() => {
      setWaypointSaved(false);
      setPhase("progress");
    }, 1200);
  }

  function onComplete() {
    const summary = {
      at: new Date().toISOString(),
      positions,
      coverage: coveragePct,
      durationS: elapsedS,
    };
    finishPatrol({ positions, coveragePct });
    setCompleted(summary);
    setConfirmOpen(false);
    setPhase("done");
  }

  const startedLabel = startedAt ? fmtClock(startedAt) : "";
  const lat = (8.4123 + progress * 0.0087).toFixed(4);
  const lng = (80.4021 + progress * 0.0063).toFixed(4);

  /* ---------- Panel 1 · Assigned Patrol Details ---------- */
  if (phase === "assigned") {
    return (
      <Phone>
        <ScreenHeader title="Assigned Patrol" onBack="home" />
        <Body>
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] font-bold tracking-tight">{ROUTE_META.name}</h2>
          </div>
          <Pill tone="progress" className="w-fit">
            Assigned
          </Pill>
          <Card>
            <Row k="PatrolRoute" v={ROUTE_META.id} strong />
            <Row k="Distance" v={`${ROUTE_META.distanceKm} km`} strong />
            <Row k="Assigned" v={ROUTE_META.assignedAt} strong />
          </Card>
          <div>
            <p className="mb-1 text-[12px] font-semibold text-muted">Route preview</p>
            <RouteMap progress={0} />
          </div>
          <Card>
            <p className="text-[12px] font-semibold text-muted">Patrol Details</p>
            <p className="mt-1 text-[13px] leading-snug">{ROUTE_META.details}</p>
          </Card>
          <div className="mt-auto pt-2">
            <BtnPrimary onClick={onStart}>Start Patrol</BtnPrimary>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 4 · Manual Waypoint (A1, optional) ---------- */
  if (phase === "waypoint") {
    return (
      <Phone>
        <ScreenHeader title="Mark Waypoint" onBack={() => setPhase("progress")} />
        <Body>
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-muted">
            <Info className="size-3.5" /> Optional Flow – Manual Waypoint
          </p>
          <RouteMap progress={progress} waypoint />
          <Card>
            <p className="text-[12px] font-semibold text-muted">Current position</p>
            <div className="mt-1 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-muted">Latitude</p>
                <p className="text-[16px] font-bold tabular-nums">{lat}° N</p>
              </div>
              <div>
                <p className="text-[11px] text-muted">Longitude</p>
                <p className="text-[16px] font-bold tabular-nums">{lng}° E</p>
              </div>
            </div>
            <div className="mt-2 border-t border-border pt-2">
              <p className="text-[11px] text-muted">Capture Mode</p>
              <p className="text-[12.5px]">
                <span className="mr-1.5 rounded bg-accent px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                  Manual
                </span>
                position captured from device
              </p>
            </div>
          </Card>
          <p className="text-[11.5px] text-subtle">Manual waypoint – saved to current patrol.</p>
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <BtnPrimary onClick={onSaveWaypoint}>Save Waypoint</BtnPrimary>
            <BtnOutline onClick={() => setPhase("progress")}>Cancel</BtnOutline>
            {waypointSaved ? (
              <ConfirmNote title="Waypoint Saved" sub="Saved to current patrol · Manual waypoint" />
            ) : null}
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 8 · Patrol Completion Summary ---------- */
  if (phase === "done" && completed) {
    return (
      <Phone>
        <ScreenHeader title="Patrol Completed" />
        <Body className="items-stretch">
          <div className="pt-2">
            <SuccessCheck />
          </div>
          <div className="text-center">
            <Pill tone="ok">Completed</Pill>
            <h2 className="mt-1.5 text-[19px] font-bold">{ROUTE_META.name}</h2>
            <p className="text-[12px] text-muted">Route {ROUTE_META.id}</p>
          </div>
          <Card className="flex items-center gap-4">
            <CoverageRing pct={completed.coverage} />
            <div>
              <p className="text-[11px] text-muted">Patrol Coverage</p>
              <p className="text-[14px] font-bold">
                {completed.coverage}% of {ROUTE_META.id} covered
              </p>
              <p className="text-[11px] text-subtle">
                Calculated from {completed.positions} recorded PatrolPositions
              </p>
            </div>
          </Card>
          <div className="flex gap-2">
            <Tile k="Completion time" v={fmtClock(completed.at)} />
            <Tile k="Duration" v={fmtDuration(completed.durationS)} />
          </div>
          <div className="flex gap-2">
            <Tile k="Positions Recorded" v={completed.positions} />
            <Tile k="Route" v={ROUTE_META.id} />
          </div>
          <div>
            <RouteMap covered height={150} />
            <p className="mt-1 flex items-center gap-1.5 px-1 text-[11px] text-muted">
              <svg width="18" height="4" aria-hidden>
                <line x1="0" y1="2" x2="18" y2="2" stroke="#1f5a43" strokeWidth="3" />
              </svg>
              Completed track
            </p>
          </div>
          <div className="mt-auto pt-2">
            <BtnPrimary onClick={() => router.navigate({ to: "/" })}>Done</BtnPrimary>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panels 2/3/5/6/7 · Patrol In Progress ---------- */
  return (
    <Phone>
      <ScreenHeader title="Patrol In Progress">
        <ConnectivityToggle />
      </ScreenHeader>
      <Body>
        {!online ? <OfflineBanner text="Data Stored Locally" /> : null}
        {online && syncingBack ? <OnlineBanner text="Connection Restored" /> : null}

        <div className="flex items-center justify-between">
          <Pill tone="progress">In Progress</Pill>
          <span className="text-[12px] text-muted">
            Started {startedLabel} · Route {ROUTE_META.id}
          </span>
        </div>
        <GpsActive
          extra={
            covered ? (
              <span className="ml-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-ok">
                <span className="size-1.5 rounded-full bg-ok" aria-hidden /> Route Covered
              </span>
            ) : undefined
          }
        />
        <RouteMap progress={progress} />
        <div className="flex gap-2">
          <Tile k="Positions Recorded" v={positions} />
          {!online || pendingSync > 0 ? (
            <Tile k="Pending Sync" v={pendingSync} />
          ) : (
            <Tile k="Elapsed Time" v={fmtDuration(elapsedS)} />
          )}
        </div>

        {!online ? (
          <HintCard>Patrol data will synchronize when connectivity returns.</HintCard>
        ) : null}

        {online && (syncingBack || justSynced) ? (
          <Card>
            <p className="flex items-center gap-1.5 text-[13px] font-semibold">
              <SyncSpin spinning={syncingBack} />
              {syncingBack ? "Synchronizing pending data…" : "Synchronization complete"}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-elevated">
              <div
                className="h-full rounded-full bg-ok transition-all duration-300"
                style={{ width: syncingBack ? "60%" : "100%" }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11.5px] text-muted">
              <span>Pending Sync</span>
              <span className="font-semibold tabular-nums">{pendingSync}</span>
            </div>
            {justSynced ? (
              <p className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-ok">
                <Check className="size-3.5" strokeWidth={3} />
                All patrol data synchronized
                <span className="font-normal text-muted">· No re-entry needed</span>
              </p>
            ) : null}
          </Card>
        ) : null}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <BtnOutline onClick={() => setPhase("waypoint")}>Mark Waypoint</BtnOutline>
          <BtnPrimary
            disabled={!covered}
            caption={covered ? undefined : "Available when route is covered"}
            onClick={() => setConfirmOpen(true)}
          >
            Complete Patrol
          </BtnPrimary>
        </div>
      </Body>

      {/* Panel 7 · Complete Patrol confirmation sheet */}
      {confirmOpen ? (
        <div className="absolute inset-0 z-10 flex flex-col justify-end bg-fg/40 md:rounded-[30px]">
          <div className="rounded-t-3xl bg-surface p-4 pb-6 shadow-2xl">
            <h3 className="text-[17px] font-bold">Complete this patrol?</h3>
            <Card className="mt-3">
              <p className="text-[14px] font-bold">Route {ROUTE_META.id}</p>
              <p className="text-[12px] text-muted">
                {positions} positions · {fmtDuration(elapsedS)}
              </p>
            </Card>
            <p className="mt-2 text-[12px] text-muted">Patrol Coverage will be calculated.</p>
            <div className="mt-3 flex gap-2">
              <div className="flex-1">
                <BtnOutline onClick={() => setConfirmOpen(false)}>Cancel</BtnOutline>
              </div>
              <div className="flex-1">
                <BtnPrimary onClick={onComplete}>Complete Patrol</BtnPrimary>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </Phone>
  );
}

function fmtDuration(totalS: number) {
  const h = Math.floor(totalS / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const s = totalS % 60;
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} m`;
  if (m > 0) return `${m} m ${String(s).padStart(2, "0")} s`;
  return `${s} s`;
}

function CoverageRing({ pct }: { pct: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" aria-label={`${pct}% coverage`} role="img">
      <circle cx="34" cy="34" r={r} fill="none" stroke="#e3ebe3" strokeWidth="7" />
      <circle
        cx="34"
        cy="34"
        r={r}
        fill="none"
        stroke="#2e7d50"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        transform="rotate(-90 34 34)"
      />
      <text x="34" y="39" textAnchor="middle" fontSize="15" fontWeight="700" fill="#16281e">
        {pct}%
      </text>
    </svg>
  );
}

function SyncSpin({ spinning }: { spinning: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={spinning ? "size-4 animate-spin text-accent" : "size-4 text-ok"}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-2.6-6.4" strokeLinecap="round" />
      <path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
