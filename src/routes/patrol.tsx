import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronRight,
  CloudUpload,
  Info,
  MapPin,
  Radio,
  RefreshCw,
  Siren,
  TriangleAlert,
} from "lucide-react";
import {
  Body,
  BtnOutline,
  BtnPrimary,
  Card,
  ConfirmNote,
  GpsActive,
  HintCard,
  ModeChip,
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
import { useField, routePointAt, ROUTE_META } from "@/lib/store";
import { fmtClock, uid } from "@/lib/utils";
import {
  coveragePercent,
  isRouteCovered,
  nextAutoRetryLabel,
  patrolTrackKm,
  type QueueItem,
} from "@/lib/domain/patrol-ops";
import {
  DEMO_COVER_POSITIONS,
  DEMO_GPS_EVERY,
  coverageChip,
  formatPatrolDuration,
  queueBadgeLabel,
} from "@/lib/domain/patrol-demo";
import {
  patrolSyncHint,
  patrolSyncStatusLabel,
} from "@/lib/domain/patrol-sync-copy";
import type { Waypoint } from "@/lib/types";

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
 *
 * A02 rules implemented here (see artifacts/a02/REPORT.md §6):
 *  - R-09 — mode chip (ONLINE / OFFLINE — QUEUED LOCALLY), last sync shown,
 *           per-record sync progress ("Syncing 2 of 7…")
 *  - R-10 — ≥64px one-tap waypoint capture + undo toast for manual marks (3b)
 *  - S1/R-05 — in-flight waypoint tail flushed before completing
 *  - S2/R-05 — upload failure → FAILED with exponential backoff (5b)
 *  - 5a — already online at save → sync runs immediately
 *  - 5c — offline at finish → queued locally, sync deferred
 *  - R-02a — UC01b Retry Failed Sync: queue with badge, per-record retry
 *  - R-07 — coverage = covered track km ÷ assigned route km (capped 100)
 */

/** Positions needed for full route coverage (demo GPS pace). */
const COVER_AT = DEMO_COVER_POSITIONS;
/** A real GPS waypoint is committed to the store every N positions. */
const GPS_EVERY = DEMO_GPS_EVERY;

type Phase = "assigned" | "progress" | "waypoint" | "queue" | "done";

function PatrolPage() {
  const router = useRouter();
  const online = useField((s) => s.online);
  const patrols = useField((s) => s.patrols);
  const incidents = useField((s) => s.incidents);
  const conflicts = useField((s) => s.conflicts);
  const lastSyncAt = useField((s) => s.lastSyncAt);
  const active = patrols.find((p) => p.status === "ACTIVE");

  const [phase, setPhase] = useState<Phase>("assigned");
  const [queueFrom, setQueueFrom] = useState<Phase>("progress");
  const [positions, setPositions] = useState(0);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [elapsedS, setElapsedS] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [waypointSaved, setWaypointSaved] = useState(false);
  const [drain, setDrain] = useState<{ total: number; done: number } | null>(null);
  const [justSynced, setJustSynced] = useState(false);
  const [heldNote, setHeldNote] = useState<string | null>(null);
  const [completed, setCompleted] = useState<{
    patrolId: string;
    at: string;
    positions: number;
    coverage: number;
    trackKm: number;
    durationS: number;
  } | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Resume in-progress patrol after navigation away (device still holds ACTIVE).
  useEffect(() => {
    const current = useField.getState().activePatrol();
    if (current && current.status === "ACTIVE") {
      setPhase((p) => (p === "assigned" ? "progress" : p));
      setPositions((n) => (n > 0 ? n : Math.max(1, current.waypoints.length * GPS_EVERY)));
      setStartedAt((s) => s ?? current.startedAt);
    }
  }, []);

  const queue = useMemo(
    () => useField.getState().queueItems(),
    // Recomputed only when the underlying record arrays change.
    [patrols, incidents, conflicts],
  );
  const holdingCount = queue.filter((q) => q.holding).length;
  const failedCount = queue.filter((q) => q.syncState === "FAILED").length;

  // ---- R-07 coverage from the recorded waypoints (never a fake fraction) ----
  const trackKm = active ? patrolTrackKm(active.waypoints) : 0;
  const coverage = coveragePercent(trackKm, ROUTE_META.distanceKm);
  const covered = isRouteCovered(coverage);

  const running = (phase === "progress" || phase === "waypoint") && !!active;

  // GPS tick: simulated device positions while the patrol runs. Every
  // GPS_EVERY-th position commits a real timestamped GPS waypoint (step 3).
  const posRef = useRef(positions);
  posRef.current = positions;
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const n = posRef.current;
      if (n >= COVER_AT) return;
      const next = n + 1;
      setPositions(next);
      setElapsedS((s) => s + 1);
      if (next % GPS_EVERY === 0) {
        useField.getState().addWaypoint("GPS", routePointAt(next / COVER_AT));
      }
    }, 700);
    return () => clearInterval(t);
  }, [running]);

  // 1-second ticker keeps retry-after countdowns honest.
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // ---- Per-record sync drain (R-09) --------------------------------------
  const drainRef = useRef(false);
  const runDrain = useCallback(async () => {
    if (drainRef.current) return;
    const items = useField
      .getState()
      .queueItems()
      .filter((i) => i.retryDue);
    if (items.length === 0) return;
    drainRef.current = true;
    setHeldNote(null);
    setJustSynced(false);
    setDrain({ total: items.length, done: 0 });
    let done = 0;
    let failed = false;
    for (const item of items) {
      // A connection drop mid-sync marks the in-flight record FAILED (5b).
      const res = await useField.getState().syncOne(item.kind, item.recordId);
      if (res === "FAILED") {
        failed = true;
        break;
      }
      done += 1;
      setDrain({ total: items.length, done });
    }
    if (failed) {
      const held = useField
        .getState()
        .queueItems()
        .filter((i) => i.holding).length;
      setHeldNote(
        `${held} record${held === 1 ? "" : "s"} held — retrying automatically`,
      );
    } else {
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 4000);
    }
    setTimeout(() => {
      setDrain(null);
      drainRef.current = false;
    }, failed ? 1500 : 400);
  }, []);

  // 5a — already online at save: synchronization runs immediately.
  useEffect(() => {
    if (!online || !running || drainRef.current) return;
    const due = useField
      .getState()
      .queueItems()
      .filter((i) => i.retryDue);
    if (due.length > 0) void runDrain();
  }, [online, running, patrols, incidents, conflicts, runDrain]);

  // A3/S2/R-05 — connectivity restored (on any screen): drain the queue —
  // FAILED records whose backoff elapsed, and anything still PENDING.
  useEffect(() => {
    if (!online || drainRef.current) return;
    const due = useField
      .getState()
      .queueItems()
      .filter((i) => i.retryDue);
    if (due.length > 0) void runDrain();
  }, [online, nowTick, phase, patrols, incidents, conflicts, runDrain]);

  // ---- Actions ------------------------------------------------------------

  function onStart() {
    startPatrolSafe();
    setStartedAt(new Date().toISOString());
    setPositions(1);
    setElapsedS(0);
    setPhase("progress");
    // Step 2 — local-first confirmation, never "Submitted" before ack.
    toast.success("Patrol started — saved on this phone", {
      description: `${ROUTE_META.id} · recorded locally as PENDING`,
    });
  }

  function startPatrolSafe() {
    const store = useField.getState();
    store.startPatrol();
    const p = store.activePatrol();
    if (p && p.waypoints.length === 0) {
      // First GPS fix at the route start.
      store.addWaypoint("GPS", ROUTE_META.start);
    }
  }

  function onSaveWaypoint() {
    const wp = useField
      .getState()
      .addWaypoint("MANUAL", routePointAt(Math.min(1, positions / COVER_AT)));
    setPositions((n) => Math.min(COVER_AT, n + 1));
    setWaypointSaved(true);
    if (wp) {
      // 3b (R-10) — the mistake-proofing undo: removes the exact mark.
      toast("Waypoint saved", {
        description: `${wp.label} · manual mark saved to current patrol`,
        action: {
          label: "Undo",
          onClick: () => {
            const removed = useField.getState().undoLastWaypoint(wp.pointId);
            if (removed) toast.success(`${removed.label} removed — no orphan records`);
          },
        },
        duration: 7000,
      });
    }
    setTimeout(() => {
      setWaypointSaved(false);
      setPhase("progress");
    }, 1100);
  }

  /** S1/R-05 — the in-flight position save is flushed before completing. */
  function inFlightTail(): Waypoint {
    const geo = routePointAt(Math.min(1, positions / COVER_AT));
    const n = (active?.waypoints.length ?? 0) + 1;
    return {
      pointId: uid(),
      lat: geo.lat,
      lng: geo.lng,
      source: "GPS",
      recordedAt: new Date().toISOString(),
      label: `WP-${String(n).padStart(2, "0")}`,
    };
  }

  function onComplete() {
    const tail = inFlightTail();
    const donePatrol = useField.getState().finishPatrol({
      positions: positions + 1,
      coveragePct: coverage,
      flushTail: [tail],
    });
    setConfirmOpen(false);
    if (!donePatrol) return;
    const mergedTrack = patrolTrackKm(donePatrol.waypoints);
    setCompleted({
      patrolId: donePatrol.patrolId,
      at: donePatrol.completedAt ?? new Date().toISOString(),
      positions: positions + 1,
      coverage: coveragePercent(mergedTrack, ROUTE_META.distanceKm),
      trackKm: mergedTrack,
      durationS: elapsedS,
    });
    setPhase("done");
    if (useField.getState().online) {
      // 5a — already online at save: sync immediately.
      toast.success("Patrol completed — synchronizing…");
      void runDrain();
    } else {
      // 5c — offline at finish: queued locally, sync deferred.
      toast.info("Patrol completed — saved on this phone", {
        description: "Will synchronize when signal returns",
      });
    }
  }

  async function retryOne(item: QueueItem) {
    // UC01b — manual retry bypasses the backoff schedule entirely.
    const res = await useField.getState().retryRecord(item.kind, item.recordId);
    if (res === "SYNCED") {
      toast.success(`${item.label} — synchronized`);
    } else {
      const fresh = useField
        .getState()
        .queueItems()
        .find((i) => i.recordId === item.recordId);
      const when = fresh?.retryAfter ? nextAutoRetryLabel(fresh.retryAfter, new Date().toISOString()) : "later";
      toast.error(`${item.label} — still held, next auto retry ${when}`);
    }
  }

  async function retryAllDue() {
    await runDrain();
  }

  const startedLabel = startedAt ? fmtClock(startedAt) : "";
  const lat = (active && active.waypoints.length > 0
    ? active.waypoints[active.waypoints.length - 1].lat
    : ROUTE_META.start.lat
  ).toFixed(4);
  const lng = (active && active.waypoints.length > 0
    ? active.waypoints[active.waypoints.length - 1].lng
    : ROUTE_META.start.lng
  ).toFixed(4);
  const progress = Math.min(1, positions / COVER_AT);
  const donePatrol = completed ? patrols.find((p) => p.patrolId === completed.patrolId) : undefined;

  /* ---------- Panel 1 · Assigned Patrol Details ---------- */
  const showAssigned =
    phase === "assigned" || ((phase === "progress" || phase === "waypoint") && !active);
  if (showAssigned) {
    return (
      <Phone>
        <ScreenHeader title="Assigned Patrol" onBack="home">
          <QueueBadge
            depth={queue.length}
            failed={failedCount}
            onClick={() => {
              setQueueFrom("assigned");
              setPhase("queue");
            }}
          />
        </ScreenHeader>
        <Body>
          <div className="flex items-center justify-between">
            <h2 className="text-[20px] font-bold tracking-tight">{ROUTE_META.name}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="progress">Assigned</Pill>
            {/* R-09 — connectivity mode chip, visible before starting */}
            <ModeChip online={online} />
          </div>
          <Card>
            <Row k="PatrolRoute" v={ROUTE_META.id} strong />
            <Row k="Distance" v={`${ROUTE_META.distanceKm} km`} strong />
            <Row k="Assigned" v={ROUTE_META.assignedAt} strong />
            <Row
              k="Last sync"
              v={lastSyncAt ? fmtClock(lastSyncAt) : "not yet"}
              strong
            />
            <Row k="Offline map" v="Downloaded" strong />
          </Card>
          <div>
            <p className="mb-1 text-[12px] font-semibold text-muted">Route preview</p>
            <RouteMap progress={0} />
          </div>
          <Card>
            <p className="text-[12px] font-semibold text-muted">Patrol Details</p>
            <p className="mt-1 text-[13px] leading-snug">{ROUTE_META.details}</p>
          </Card>
          {!online ? (
            <HintCard>
              Offline — the patrol and its waypoints will be queued on this device and
              synchronize when signal returns.
            </HintCard>
          ) : null}
          <div className="mt-auto pt-2">
            <BtnPrimary onClick={onStart}>Start Patrol</BtnPrimary>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- UC01b · Retry Failed Sync (R-02a) ---------- */
  if (phase === "queue") {
    return (
      <Phone>
        <ScreenHeader title="Sync Queue" onBack={() => setPhase(queueFrom)} />
        <Body>
          <div className="flex items-center justify-between">
            <Pill tone={failedCount > 0 ? "warn" : "muted"}>
              {queue.length} record{queue.length === 1 ? "" : "s"} queued
            </Pill>
            <ModeChip online={online} />
          </div>

          {queue.length === 0 ? (
            <Card className="items-center py-6 text-center">
              <SuccessCheck size={48} />
              <p className="mt-2 text-[14px] font-bold">Queue clear</p>
              <p className="text-[12px] text-muted">
                Every record has been acknowledged by the server.
              </p>
              <p className="mt-1 text-[11px] text-subtle">
                Last sync {lastSyncAt ? fmtClock(lastSyncAt) : "—"}
              </p>
            </Card>
          ) : (
            <>
              {queue.map((item) => (
                <QueueRow
                  key={`${item.kind}-${item.recordId}`}
                  item={item}
                  now={nowTick}
                  busy={drain != null}
                  onRetry={() => void retryOne(item)}
                />
              ))}
              <BtnOutline disabled={drain != null} onClick={() => void retryAllDue()}>
                {drain
                  ? `Syncing ${drain.done} of ${drain.total}…`
                  : "Retry all due records"}
              </BtnOutline>
              <HintCard>
                Retry sends immediately and bypasses the backoff schedule. Held records
                also retry automatically when their schedule elapses.
              </HintCard>
            </>
          )}
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
            {/* R-10 — the one-tap capture target is ≥64px. */}
            <button
              type="button"
              onClick={onSaveWaypoint}
              className="flex h-16 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[16px] font-semibold text-accent-fg transition-colors hover:bg-[#174935]"
            >
              <MapPin className="size-5" strokeWidth={2.25} />
              Save Waypoint
            </button>
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
                {completed.trackKm.toFixed(1)} km of {ROUTE_META.distanceKm} km · R-07 formula
              </p>
            </div>
          </Card>
          <div className="flex gap-2">
            <Tile k="Completion time" v={fmtClock(completed.at)} />
            <Tile k="Duration" v={formatPatrolDuration(completed.durationS)} />
          </div>
          <div className="flex gap-2">
            <Tile k="Positions Recorded" v={completed.positions} />
            <Tile k="Waypoints" v={donePatrol?.waypoints.length ?? 0} />
          </div>

          {/* Step 6 — sync state on the summary, IDs in secondary typography */}
          <SyncStateCard patrolId={completed.patrolId} onOpenQueue={() => {
            setQueueFrom("done");
            setPhase("queue");
          }} />

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
        {online && drain ? <OnlineBanner text="Connection Restored" /> : null}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill tone="progress">In Progress</Pill>
            <ModeChip online={online} />
          </div>
          <span className="text-right text-[11px] text-muted">
            Started {startedLabel}
            <br />
            Route {ROUTE_META.id}
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
          <Tile k="Track" v={`${trackKm.toFixed(1)} km`} />
          <Tile k="Coverage" v={coverageChip(coverage)} />
        </div>

        {/* T1/H4 — queue depth visible at all times */}
        <button
          type="button"
          onClick={() => {
            setQueueFrom("progress");
            setPhase("queue");
          }}
          className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 text-left text-[13px] font-semibold transition-colors hover:bg-elevated"
        >
          <CloudUpload className={queue.length > 0 ? "size-4 text-warn" : "size-4 text-ok"} />
          <span className="flex-1">
            {queueBadgeLabel(queue.length, failedCount)}
            {failedCount > 0 ? (
              <span className="block text-[11.5px] font-semibold text-danger">
                {failedCount} failed — held for retry
              </span>
            ) : null}
          </span>
          <ChevronRight className="size-4 text-subtle" />
        </button>

        {/* R-09 — per-record sync progress */}
        {drain ? (
          <Card>
            <p className="flex items-center gap-1.5 text-[13px] font-semibold">
              <SyncSpin spinning />
              {`Syncing ${drain.done} of ${drain.total}…`}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-elevated">
              <div
                className="h-full rounded-full bg-ok transition-all duration-300"
                style={{ width: `${Math.round((drain.done / drain.total) * 100)}%` }}
              />
            </div>
          </Card>
        ) : null}
        {justSynced ? (
          <Card>
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ok">
              <Check className="size-3.5" strokeWidth={3} />
              All patrol data synchronized
              <span className="font-normal text-muted">· No re-entry needed</span>
            </p>
          </Card>
        ) : null}
        {/* 5b — upload failure surfaced with the backoff schedule */}
        {heldNote ? (
          <Card>
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-warn">
              <TriangleAlert className="size-4" />
              {heldNote}
            </p>
            {queue
              .filter((q) => q.holding)
              .slice(0, 3)
              .map((q) => (
                <p key={q.recordId} className="mt-1 text-[11.5px] text-muted">
                  {q.label} · {q.failureReason} · retry {nextAutoRetryLabel(q.retryAfter ?? "", new Date().toISOString())}
                </p>
              ))}
          </Card>
        ) : null}

        {!online ? (
          <HintCard>Patrol data will synchronize when connectivity returns.</HintCard>
        ) : null}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          {/* R-10 — one-tap ≥64px capture target */}
          <button
            type="button"
            onClick={() => setPhase("waypoint")}
            className="flex h-16 w-full items-center justify-center gap-2 rounded-xl border-2 border-accent bg-surface text-[16px] font-semibold text-accent transition-colors hover:bg-ok-bg"
          >
            <MapPin className="size-5" strokeWidth={2.25} />
            Mark Waypoint
          </button>
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
                {positions + 1} positions · {formatPatrolDuration(elapsedS)} · in-flight waypoint will be
                saved first
              </p>
            </Card>
            <p className="mt-2 text-[12px] text-muted">Patrol Coverage will be calculated.</p>
            <div className="mt-3 flex gap-2">
              <div className="flex-1">
                {/* 4a — cancel finish: the patrol remains ACTIVE */}
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

// ---------------------------------------------------------------------------

/** T1/H4 — queue depth badge in the header. */
function QueueBadge({
  depth,
  failed,
  onClick,
}: {
  depth: number;
  failed: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Open sync queue"
      className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-1 text-[11px] font-bold hover:bg-elevated"
    >
      <CloudUpload
        className={
          failed > 0 ? "size-3.5 text-warn" : depth > 0 ? "size-3.5 text-ok" : "size-3.5 text-subtle"
        }
      />
      <span className="tabular-nums">{depth}</span>
      <span
        className={
          failed > 0
            ? "text-warn"
            : depth > 0
              ? "text-ok"
              : "text-subtle"
        }
      >
        {failed > 0 ? "HELD" : depth > 0 ? "QUEUED" : "SYNCED"}
      </span>
    </button>
  );
}

const KIND_ICON = {
  PATROL: <MapPin className="size-4 text-accent" />,
  INCIDENT: <Siren className="size-4 text-danger" />,
  CONFLICT: <Radio className="size-4 text-muted" />,
} as const;

/** One row of the UC01b queue: state, failure reason, retry schedule, Retry. */
function QueueRow({
  item,
  now,
  busy,
  onRetry,
}: {
  item: QueueItem;
  now: number;
  busy: boolean;
  onRetry: () => void;
}) {
  void now; // re-renders arrive via the parent ticker
  const isoNow = new Date().toISOString();
  return (
    <Card>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5">{KIND_ICON[item.kind]}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-bold">{item.label}</p>
          {item.sublabel ? (
            <p className="truncate text-[11.5px] text-muted">{item.sublabel}</p>
          ) : null}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {item.syncState === "FAILED" ? (
              <Pill tone="danger">Failed · attempt {item.syncAttempts}</Pill>
            ) : (
              <Pill tone="muted">Pending</Pill>
            )}
            {item.holding && item.retryAfter ? (
              <span className="text-[11px] font-semibold text-warn">
                auto retry {nextAutoRetryLabel(item.retryAfter, isoNow)}
              </span>
            ) : null}
            {item.retryDue && item.syncState === "FAILED" ? (
              <span className="text-[11px] font-semibold text-ok">retry due now</span>
            ) : null}
          </div>
          {item.failureReason ? (
            <p className="mt-1 flex items-center gap-1 text-[11.5px] text-danger">
              <TriangleAlert className="size-3 shrink-0" />
              {item.failureReason}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onRetry}
          disabled={busy}
          className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-ok/40 bg-ok-bg px-3 text-[12px] font-bold text-ok transition-colors hover:bg-elevated disabled:opacity-40"
        >
          <RefreshCw className="size-3.5" />
          Retry
        </button>
      </div>
    </Card>
  );
}

/** Step 6 — the completed record's sync state on the summary screen. */
function SyncStateCard({
  patrolId,
  onOpenQueue,
}: {
  patrolId: string;
  onOpenQueue: () => void;
}) {
  const patrol = useField((s) => s.patrols.find((p) => p.patrolId === patrolId));
  const lastSyncAt = useField((s) => s.lastSyncAt);
  const online = useField((s) => s.online);
  if (!patrol) return null;
  if (patrol.syncState === "SYNCED") {
    return (
      <Card>
        <p className="flex items-center gap-1.5 text-[13px] font-bold text-ok">
          <Check className="size-4" strokeWidth={3} />
          Synchronized
        </p>
        <p className="mt-0.5 text-[11.5px] text-muted">
          Server acknowledged · idempotent upsert by patrol ID · last sync{" "}
          {lastSyncAt ? fmtClock(lastSyncAt) : "—"}
        </p>
      </Card>
    );
  }
  if (patrol.syncState === "FAILED") {
    return (
      <Card>
        <p className="flex items-center gap-1.5 text-[13px] font-bold text-danger">
          <TriangleAlert className="size-4" />
          Sync failed — held for retry
        </p>
        <p className="mt-0.5 text-[11.5px] text-muted">{patrol.failureReason}</p>
        <button
          type="button"
          onClick={onOpenQueue}
          className="mt-1.5 flex items-center gap-1 text-[12px] font-bold text-accent hover:underline"
        >
          Open sync queue to retry <ChevronRight className="size-3.5" />
        </button>
      </Card>
    );
  }
  return (
    <Card>
      <p className="flex items-center gap-1.5 text-[13px] font-bold text-warn">
        <CloudUpload className="size-4" />
        {patrol.status === "COMPLETED" && !online
          ? "Pending — will sync when signal returns"
          : patrolSyncStatusLabel("PENDING")}
      </p>
      <p className="mt-0.5 text-[11.5px] text-muted">{patrolSyncHint("PENDING")}</p>
      <button
        type="button"
        onClick={onOpenQueue}
        className="mt-1.5 flex items-center gap-1 text-[12px] font-bold text-accent hover:underline"
      >
        Open sync queue <ChevronRight className="size-3.5" />
      </button>
    </Card>
  );
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
