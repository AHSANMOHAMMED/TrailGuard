import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Smartphone,
  Sprout,
  TriangleAlert,
  Wifi,
} from "lucide-react";
import {
  Body,
  BtnOutline,
  BtnPrimary,
  Card,
  CONSEQUENCE,
  HintCard,
  ModeChip,
  OfflineBanner,
  Phone,
  Pill,
  PinMap,
  RadioRow,
  Row,
  ScreenHeader,
  SuccessCheck,
} from "@/components/field";
import { ConnectivityToggle } from "@/components/connectivity-toggle";
import { Guard } from "@/components/auth-gate";
import { useAuth } from "@/lib/auth-store";
import { useField } from "@/lib/store";
import { fmtClock } from "@/lib/utils";

export const Route = createFileRoute("/conflict")({
  component: () => (
    <Guard area="conflict">
      <ConflictPage />
    </Guard>
  ),
});

/**
 * UC04-S01 — Manage Human-Wildlife Conflict Reports (full scenario coverage).
 *
 * Main flow 1–13: report via app/SMS → system validates → report stored →
 * operations dashboard → staff review → response → status update.
 * Alternate flows: Mobile App · SMS short code · Multiple Reports (dashboard
 * lists every report separately and flags possible conflict patterns).
 * Exception flows: No Connectivity (stored locally, auto-sync) · Incomplete
 * Report (system identifies and prompts for missing fields) · System Error
 * (report is NOT marked submitted until processed; retry) · Dashboard
 * Unavailable (report kept; appears when the connection is restored).
 * UI follows the hi-fi wireframe (Figure 18) design system.
 */

const TYPES = ["Elephant Sighting", "Crop Raiding", "Other Conflict"];
const DEFAULT_LOCATION = "Nagoda east field, near the canal";
const SMS_SHORT_CODE = "7444";

type Step =
  | "intro"
  | "channel"
  | "details"
  | "review"
  | "processing"
  | "offline"
  | "submitted"
  | "dashboard"
  | "staffReview"
  | "responded";

function ConflictPage() {
  const router = useRouter();
  const session = useAuth((s) => s.session);
  const {
    online,
    conflicts,
    createConflict,
    respondConflict,
    markConflictSynced,
    synchronize,
  } = useField();

  const [step, setStep] = useState<Step>("intro");
  const [channel, setChannel] = useState<"Mobile App" | "SMS">("Mobile App");
  const [type, setType] = useState<string | null>(null);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [description, setDescription] = useState("");
  /** Incomplete-report exception: show what the system identified as missing. */
  const [showMissing, setShowMissing] = useState(false);
  /** System-error exception: processing failed; nothing was submitted. */
  const [procFailed, setProcFailed] = useState(false);
  const failRequested = useRef(false);
  const [checks, setChecks] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wasOffline, setWasOffline] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);

  const selected = conflicts.find((c) => c.reportId === selectedId) ?? null;
  const isStaff = session?.role === "RANGER" || session?.role === "LIAISON";

  // Role assignment: only Ranger and Community Liaison Officer operate the
  // dashboard and record responses (use case model, steps 9–13). Community
  // members submit reports; everything past submission is staff work.
  if (!isStaff && (step === "dashboard" || step === "staffReview" || step === "responded")) {
    return (
      <Phone>
        <ScreenHeader title="Community Conflict Report" onBack={() => setStep("intro")} />
        <Body>
          <HintCard>
            The operations dashboard and response recording are handled by the Ranger and the
            Community Liaison Officer. Your report has been submitted for their review.
          </HintCard>
          <div className="mt-auto pt-2">
            <BtnPrimary onClick={() => router.navigate({ to: "/" })}>Back to Home</BtnPrimary>
          </div>
        </Body>
      </Phone>
    );
  }

  const missing = [
    !type ? "Conflict type" : null,
    location.trim().length === 0 ? "Incident location" : null,
    description.trim().length === 0 ? "Short description" : null,
  ].filter((m): m is string => m !== null);

  // Step 7 — validate + create PENDING; only claim Submitted after Sync ack.
  useEffect(() => {
    if (step !== "processing" || procFailed) return;
    setChecks(0);
    failRequested.current = false;
    const t = setInterval(() => setChecks((c) => c + 1), 380);
    let cancelled = false;
    const done = setTimeout(() => {
      clearInterval(t);
      if (failRequested.current) {
        setProcFailed(true);
        return;
      }
      void (async () => {
        const r = createConflict({
          type: type ?? "Other Conflict",
          location,
          channel,
          description,
        });
        setSelectedId(r.reportId);
        if (online) {
          await synchronize().catch(() => undefined);
          if (!cancelled) setStep("submitted");
        } else {
          setWasOffline(true);
          if (!cancelled) setStep("offline");
        }
      })();
    }, 2100);
    return () => {
      cancelled = true;
      clearInterval(t);
      clearTimeout(done);
    };
  }, [
    step,
    procFailed,
    online,
    type,
    location,
    channel,
    description,
    createConflict,
    synchronize,
  ]);

  // No-connectivity exception → connectivity returns while stored locally.
  useEffect(() => {
    if (step !== "offline" || !online || !selected) return;
    setSyncingNow(true);
    let cancelled = false;
    const t = setTimeout(() => {
      // Upsert by the same reportId — never mint a duplicate on restore.
      markConflictSynced(selected.reportId);
      if (cancelled) return;
      setSyncingNow(false);
      setStep("submitted");
    }, 1500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [step, online, selected, markConflictSynced]);

  /* ---------- Panel 1 · Report Wildlife Conflict ---------- */
  if (step === "intro") {
    return (
      <Phone>
        <ScreenHeader title="Report Wildlife Conflict" onBack="home">
          <div className="flex items-center gap-2">
            <ModeChip online={online} />
            <ConnectivityToggle />
          </div>
        </ScreenHeader>
        <Body>
          <div>
            <h2 className="text-[20px] font-bold tracking-tight">Community Conflict Report</h2>
            <p className="text-[13px] text-muted">
              Report wildlife sightings or conflict near the park.
            </p>
          </div>
          <PinMap height={130} pinLabel="" caption="near park boundary" />
          <div>
            <p className="mb-1.5 text-[13px] font-semibold">What you can report</p>
            <div className="flex flex-col gap-2">
              <Card className="flex items-center gap-3">
                <ElephantIcon className="size-5 shrink-0 text-accent" />
                <span>
                  <span className="block text-[13.5px] font-semibold">Elephant Sighting</span>
                  <span className="block text-[12px] text-muted">
                    Elephants seen near homes or fields
                  </span>
                </span>
              </Card>
              <Card className="flex items-center gap-3">
                <Sprout className="size-5 shrink-0 text-accent" strokeWidth={2} />
                <span>
                  <span className="block text-[13.5px] font-semibold">Crop Raiding</span>
                  <span className="block text-[12px] text-muted">
                    Damage to paddy, banana or other crops
                  </span>
                </span>
              </Card>
            </div>
          </div>
          <p className="text-[11.5px] text-subtle">
            Reports can also be sent by SMS to short code {SMS_SHORT_CODE}.
          </p>
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <BtnPrimary onClick={() => setStep("channel")}>Start Report</BtnPrimary>
            {isStaff ? (
              <BtnOutline onClick={() => setStep("dashboard")}>
                <span className="inline-flex items-center gap-2">
                  <LayoutDashboard className="size-4" strokeWidth={2} />
                  Operations Dashboard ({conflicts.length})
                </span>
              </BtnOutline>
            ) : null}
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 2 · Reporting Channel (alternate flows) ---------- */
  if (step === "channel") {
    return (
      <Phone>
        <ScreenHeader title="Reporting Channel" onBack={() => setStep("intro")} />
        <Body>
          <div>
            <h2 className="text-[18px] font-bold">How would you like to report?</h2>
            <p className="text-[12.5px] text-muted">
              Choose one channel – both reach the wildlife team.
            </p>
          </div>
          <RadioRow
            label="Mobile App"
            sub="Fill in the report on this device"
            icon={<Smartphone className="size-4" strokeWidth={2} />}
            selected={channel === "Mobile App"}
            onSelect={() => setChannel("Mobile App")}
          />
          <RadioRow
            label="SMS"
            sub={`Text the details to short code ${SMS_SHORT_CODE}`}
            icon={<MessageSquare className="size-4" strokeWidth={2} />}
            selected={channel === "SMS"}
            onSelect={() => setChannel("SMS")}
          />
          <HintCard>Alternative channels – a report uses one of them.</HintCard>
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <BtnPrimary onClick={() => setStep("details")}>Continue</BtnPrimary>
            <BtnOutline onClick={() => setStep("intro")}>Cancel</BtnOutline>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 3 · Conflict Details (+ Incomplete Report exception) ---------- */
  if (step === "details") {
    return (
      <Phone>
        <ScreenHeader title="Conflict Details" onBack={() => setStep("channel")} />
        <Body>
          <p className="text-[13px] font-semibold">Conflict Type</p>
          <div className="flex flex-col gap-2">
            {TYPES.map((t) => (
              <RadioRow key={t} label={t} selected={type === t} onSelect={() => setType(t)} />
            ))}
          </div>
          {showMissing && !type ? <FieldError text="Please select a conflict type." /> : null}

          <p className="text-[13px] font-semibold">Incident Location</p>
          <div>
            <PinMap height={110} pinLabel="" caption="tap to move the pin" />
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5">
              <MapPin className="size-4 shrink-0 text-accent" strokeWidth={2} />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-transparent text-[14px] outline-none"
                aria-label="Incident location"
              />
            </div>
          </div>
          {showMissing && location.trim().length === 0 ? (
            <FieldError text="Please provide the incident location." />
          ) : null}

          <div>
            <p className="mb-1 text-[13px] font-semibold">Short Description</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 160))}
              rows={3}
              placeholder="Three elephants in the paddy field near the canal, moving towards the houses."
              className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-accent"
            />
            <p className="text-right text-[11px] text-subtle">{description.length} / 160</p>
          </div>
          {showMissing && description.trim().length === 0 ? (
            <FieldError text="Please enter a short description." />
          ) : null}

          {showMissing && missing.length > 0 ? (
            <div className="rounded-lg border border-danger/40 bg-danger-bg px-3 py-2.5 text-[12.5px] text-danger">
              <p className="flex items-center gap-1.5 font-bold">
                <TriangleAlert className="size-4" strokeWidth={2} /> Incomplete report
              </p>
              <p className="mt-0.5">
                The system identified missing information: {missing.join(", ")}. Provide the
                required details to submit.
              </p>
            </div>
          ) : (
            <HintCard>
              By SMS: text the conflict type, location and description to short code{" "}
              {SMS_SHORT_CODE}.
            </HintCard>
          )}

          <div className="mt-auto flex flex-col gap-2 pt-2">
            <BtnPrimary
              onClick={() => {
                if (missing.length > 0) {
                  setShowMissing(true);
                  return;
                }
                setShowMissing(false);
                setStep("review");
              }}
            >
              Continue
            </BtnPrimary>
            <BtnOutline onClick={() => setStep("channel")}>Back</BtnOutline>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 4 · Review Report (+ SMS message preview) ---------- */
  if (step === "review") {
    return (
      <Phone>
        <ScreenHeader title="Review Report" onBack={() => setStep("details")}>
          <ModeChip online={online} />
        </ScreenHeader>
        <Body>
          <p className="text-[14px] font-bold">Check the details before sending</p>
          {!online ? <HintCard>{CONSEQUENCE.savedOffline}</HintCard> : null}
          <Card>
            <Row k="Conflict Type" v={type} strong />
            <Row k="Location" v={location} strong />
            <Row k="Reporting Channel" v={channel} strong />
          </Card>
          {channel === "SMS" ? (
            <div>
              <p className="mb-1 text-[12px] font-semibold text-muted">
                SMS message · to short code {SMS_SHORT_CODE}
              </p>
              <div className="rounded-xl rounded-bl-sm border border-border bg-elevated px-3 py-2.5">
                <p className="font-mono text-[12.5px] leading-snug">
                  CONFLICT {type?.toUpperCase()}; {location}; {description}
                </p>
              </div>
              <p className="mt-1 text-[11px] text-subtle">
                The system creates the conflict report from the received SMS message.
              </p>
            </div>
          ) : (
            <div>
              <p className="mb-1 text-[12px] font-semibold text-muted">Description</p>
              <Card>
                <p className="text-[13.5px] leading-snug">{description}</p>
              </Card>
            </div>
          )}
          <PinMap height={120} pinLabel="" />
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <BtnPrimary
              onClick={() => {
                setProcFailed(false);
                setStep("processing");
              }}
            >
              {channel === "SMS" ? "Send via SMS" : "Submit Report"}
            </BtnPrimary>
            <BtnOutline onClick={() => setStep("details")}>Edit</BtnOutline>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Step 7 · System validates & stores (+ System Error exception) ---------- */
  if (step === "processing") {
    const items = ["Conflict type", "Incident location", "Short description"];
    return (
      <Phone>
        <ScreenHeader title={channel === "SMS" ? "Sending SMS Report" : "Submitting Report"} />
        <Body>
          {!procFailed ? (
            <>
              <div className="flex justify-center pt-6">
                <Spinner />
              </div>
              <p className="text-center text-[14px] font-semibold">
                {channel === "SMS"
                  ? `Message sent to ${SMS_SHORT_CODE} · processing report…`
                  : "Validating required information…"}
              </p>
              <Card>
                {items.map((label, i) => (
                  <div key={label} className="flex items-center justify-between py-1.5">
                    <span className="flex items-center gap-2 text-[13px]">
                      <span
                        className={
                          checks > i
                            ? "flex size-4.5 items-center justify-center rounded-full bg-ok"
                            : "size-4.5 rounded-full border-2 border-border"
                        }
                      >
                        {checks > i ? (
                          <Check className="size-3 text-white" strokeWidth={3} />
                        ) : null}
                      </span>
                      {label}
                    </span>
                    <span className="text-[11px] text-subtle">{checks > i ? "present" : ""}</span>
                  </div>
                ))}
              </Card>
              <div>
                <p className="text-[13px] font-semibold">
                  Creating report · sending to operations dashboard…
                </p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-elevated">
                  <div
                    className="h-full rounded-full bg-ok transition-all duration-500"
                    style={{ width: `${Math.min(100, checks * 30)}%` }}
                  />
                </div>
              </div>
              <details className="mt-auto pb-1 text-center">
                <summary className="cursor-pointer text-[11px] text-subtle hover:underline">
                  Field test tools
                </summary>
                <button
                  type="button"
                  onClick={() => {
                    failRequested.current = true;
                  }}
                  className="mt-1 text-[11px] text-subtle underline-offset-2 hover:underline"
                >
                  Simulate processing error
                </button>
              </details>
            </>
          ) : (
            <>
              <div className="mx-auto mt-6 flex size-16 items-center justify-center rounded-full bg-danger-bg">
                <TriangleAlert className="size-7 text-danger" strokeWidth={2} />
              </div>
              <div className="text-center">
                <Pill tone="danger">System Error</Pill>
                <h2 className="mt-2 text-[17px] font-bold">Report could not be processed</h2>
                <p className="mt-1 text-[13px] text-muted">
                  The system encountered an error while processing the report.
                </p>
              </div>
              <div className="rounded-lg border border-danger/40 bg-danger-bg px-3 py-2.5 text-[12.5px] text-danger">
                The report has <span className="font-bold">not</span> been marked as submitted.
                Nothing was stored — try again to submit it.
              </div>
              <div className="mt-auto flex flex-col gap-2 pt-2">
                <BtnPrimary onClick={() => setProcFailed(false)}>Try Again</BtnPrimary>
                <BtnOutline onClick={() => setStep("review")}>Back to Review</BtnOutline>
              </div>
            </>
          )}
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 5 · Offline Report (No Connectivity exception) ---------- */
  if (step === "offline") {
    return (
      <Phone>
        <ScreenHeader title="Conflict Report">
          <ConnectivityToggle />
        </ScreenHeader>
        <Body>
          <OfflineBanner text="Report Stored Locally" />
          <Pill tone="warn" className="w-fit">
            Stored Locally
          </Pill>
          <Card>
            <Row k="Conflict Type" v={type} strong />
            <Row k="Location" v={location} strong />
            <Row k="Reporting Channel" v={channel} strong />
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-muted">Pending Sync</span>
              <span className="text-[17px] font-bold tabular-nums">1</span>
            </div>
            <p className="text-[12px] text-muted">
              Your report will synchronize when connectivity returns.
            </p>
            {syncingNow ? (
              <p className="mt-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-ok">
                <Wifi className="size-3.5" /> Connection restored · synchronizing…
              </p>
            ) : null}
          </Card>
          <HintCard>Conditional – shown only when there is no network at submit time.</HintCard>
          <div className="mt-auto pt-2">
            <BtnOutline onClick={() => router.navigate({ to: "/" })}>OK</BtnOutline>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 6 · Submitted only after SYNCED ack ---------- */
  if (step === "submitted") {
    const acked = selected?.syncState === "SYNCED";
    return (
      <Phone>
        <ScreenHeader title={acked ? (wasOffline ? "Report Synchronised" : "Report Submitted") : "Report Saved"} />
        <Body>
          <div className="pt-2">
            <SuccessCheck />
          </div>
          <div className="text-center">
            <h2 className="text-[17px] font-bold">
              {acked
                ? wasOffline
                  ? "Report Synchronised Successfully"
                  : "Report Submitted Successfully"
                : "Saved on this phone"}
            </h2>
            <p className="text-[12px] text-muted">
              {acked
                ? "Wildlife staff will review your report."
                : "Pending sync — Sync will upsert this same report id."}
            </p>
            <div className="mt-1.5">
              <Pill tone={acked ? "ok" : "warn"}>
                {acked ? (wasOffline ? "Synchronised" : "Submitted") : "Pending sync"}
              </Pill>
            </div>
          </div>
          <Card>
            <Row k="Conflict Type" v={type} strong />
            <Row k="Location" v={location} strong />
            <Row k="Reporting Channel" v={channel} strong />
            <Row k="Status" v={acked ? "SYNCED" : "PENDING"} strong />
            {selectedId ? <Row k="Report id" v={selectedId.slice(0, 8)} /> : null}
          </Card>
          {channel === "SMS" ? (
            <HintCard>
              Received via SMS short code {SMS_SHORT_CODE} — the system created this report from the
              SMS message.
            </HintCard>
          ) : null}
          <HintCard>{acked ? CONSEQUENCE.synced : CONSEQUENCE.pendingSync}</HintCard>
          {wasOffline && acked ? (
            <HintCard>
              <span className="font-semibold">Only if previously offline (Screen 5)</span>
              <span className="mt-1 flex items-center gap-1.5 font-semibold text-ok">
                <Wifi className="size-3.5" /> Connection restored · synced automatically
                <span className="ml-auto tabular-nums">1 → 0</span>
              </span>
            </HintCard>
          ) : null}
          <div className="mt-auto pt-2">
            {isStaff ? (
              <BtnPrimary onClick={() => setStep("dashboard")}>Done</BtnPrimary>
            ) : (
              <BtnPrimary onClick={() => router.navigate({ to: "/" })}>Done</BtnPrimary>
            )}
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Steps 9–10 · Operations Dashboard (Multiple Reports +
       Dashboard Unavailable exception) ---------- */
  // Review/response screens need a selected report; without one (e.g. a stale
  // id after a reset) the dashboard is the sensible place to land.
  if (step === "dashboard" || ((step === "staffReview" || step === "responded") && !selected)) {
    const byType = new Map<string, number>();
    for (const c of conflicts) byType.set(c.type, (byType.get(c.type) ?? 0) + 1);
    const pattern = [...byType.entries()].find(([, n]) => n >= 2);

    return (
      <Phone>
        <ScreenHeader title="Operations Dashboard" onBack={() => setStep("intro")}>
          <ConnectivityToggle />
        </ScreenHeader>
        <Body>
          <p className="text-[12px] text-muted">
            Community Conflict Reports · reviewing as Ranger / Community Liaison Officer
          </p>
          {!online ? (
            <>
              <OfflineBanner text="Dashboard Unavailable" />
              <Card>
                <p className="text-[13.5px] font-semibold">Reports are stored safely.</p>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  Received reports are kept by the system and will appear on the dashboard once the
                  connection is restored.
                </p>
              </Card>
              <HintCard>
                Exception flow – a valid report is received while the operations dashboard is
                temporarily unavailable.
              </HintCard>
            </>
          ) : conflicts.length === 0 ? (
            <Card>
              <p className="text-[13.5px] text-muted">No community reports yet.</p>
            </Card>
          ) : (
            <>
              {pattern ? (
                <div className="rounded-lg border border-warn/40 bg-warn-bg px-3 py-2.5 text-[12.5px] text-warn">
                  <p className="flex items-center gap-1.5 font-bold">
                    <TriangleAlert className="size-4" strokeWidth={2} /> Possible conflict pattern
                  </p>
                  <p className="mt-0.5">
                    {pattern[1]} reports of {pattern[0]} near the park boundary — review together to
                    identify a trend.
                  </p>
                </div>
              ) : null}
              <div className="flex flex-col gap-2">
                {conflicts.map((c) => (
                  <button
                    key={c.reportId}
                    type="button"
                    onClick={() => {
                      setSelectedId(c.reportId);
                      setStep("staffReview");
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:bg-elevated"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-[14px] font-bold">{c.type}</span>
                        {c.status === "RESPONDED" ? (
                          <Pill tone="ok">Responded</Pill>
                        ) : (
                          <Pill tone="progress">Submitted</Pill>
                        )}
                      </span>
                      <span className="block truncate text-[12px] text-muted">
                        {c.location} · {fmtClock(c.receivedAt)} · {c.channel}
                      </span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-subtle" />
                  </button>
                ))}
              </div>
              <HintCard>
                Multiple reports from the same area are stored separately — each row is one
                community report.
              </HintCard>
            </>
          )}
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 7 · Community Report Review (staff) ---------- */
  if (step === "staffReview" && selected) {
    return (
      <Phone>
        <ScreenHeader title="Community Conflict Report" onBack={() => setStep("dashboard")} />
        <Body>
          <div className="flex items-center justify-between">
            {selected.status === "RESPONDED" ? (
              <Pill tone="ok">Responded</Pill>
            ) : (
              <Pill tone="progress">Submitted</Pill>
            )}
            <span className="text-[12px] text-muted">
              Received {fmtClock(selected.receivedAt)} · {selected.channel}
            </span>
          </div>
          {selected.highPriority ? (
            <div className="rounded-xl border border-danger/50 bg-danger-bg px-3 py-2.5">
              <p className="flex items-center justify-between text-[13px] font-bold text-danger">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden>⚠</span> HIGH PRIORITY
                </span>
                <span className="text-[10px] font-semibold uppercase text-danger/70">optional</span>
              </p>
              <p className="text-[12px] text-danger/80">Immediate response recommended</p>
            </div>
          ) : null}
          <Card>
            <Row k="Conflict Type" v={selected.type} strong />
            <Row k="Location" v={selected.location} strong />
            <Row k="Reporting Channel" v={selected.channel} strong />
            <Row k="Report Status" v={selected.status} strong />
          </Card>
          <div>
            <p className="mb-1 text-[12px] font-semibold text-muted">Description</p>
            <Card>
              <p className="text-[13.5px] leading-snug">{selected.description}</p>
            </Card>
          </div>
          <PinMap height={110} pinLabel="" caption="Near park boundary" />
          <p className="text-[11.5px] text-subtle">
            Reviewing as Ranger / Community Liaison Officer
          </p>
          <div className="mt-auto pt-2">
            {selected.status === "RESPONDED" ? (
              <BtnOutline onClick={() => setStep("responded")}>View Response</BtnOutline>
            ) : (
              <BtnPrimary
                onClick={() => {
                  respondConflict(selected.reportId);
                  setStep("responded");
                }}
              >
                Respond to Report
              </BtnPrimary>
            )}
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 8 · Response Recorded (steps 11–13) ---------- */
  if (!selected) return null; // unreachable: handled by the dashboard branch
  return (
    <Phone>
      <ScreenHeader title="Community Conflict Report" onBack={() => setStep("staffReview")} />
      <Body>
        <Card className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-ok">
            <Check className="size-5 text-white" strokeWidth={3} />
          </span>
          <span>
            <span className="block text-[11px] text-muted">Response Status</span>
            <span className="block text-[16px] font-bold text-ok">RESPONDED</span>
            <span className="block text-[11px] text-muted">
              Updated {fmtClock(selected.respondedAt ?? new Date().toISOString())}
            </span>
          </span>
        </Card>
        <Card>
          <Row k="Responder" v="Ranger / Community Liaison Officer" strong />
          <Row k="Conflict Type" v={selected.type} strong />
          <Row k="Location" v={selected.location} strong />
          <Row k="Current Status" v="RESPONDED" strong />
        </Card>
        <div>
          <p className="mb-1 text-[12px] font-semibold text-muted">Response</p>
          <Card>
            <p className="text-[13.5px] leading-snug">
              Appropriate response initiated and recorded. Report status updated to RESPONDED.
            </p>
          </Card>
        </div>
        <HintCard>
          The report and its response are stored as historical data used to identify human-wildlife
          conflict trends.
        </HintCard>
        <PinMap height={110} pinLabel="" />
        <div className="mt-auto flex flex-col gap-2 pt-2">
          <BtnOutline onClick={() => setStep("dashboard")}>Back to Dashboard</BtnOutline>
          <BtnPrimary onClick={() => router.navigate({ to: "/" })}>Done</BtnPrimary>
        </div>
      </Body>
    </Phone>
  );
}

function FieldError({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-1.5 text-[12px] font-semibold text-danger">
      <TriangleAlert className="size-3.5" strokeWidth={2} /> {text}
    </p>
  );
}

function Spinner() {
  return (
    <svg viewBox="0 0 48 48" className="size-12 animate-spin text-accent" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="20" stroke="#e3ebe3" strokeWidth="5" />
      <path
        d="M44 24a20 20 0 0 0-20-20"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ElephantIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden
    >
      <path
        d="M4.5 17v-5.5A5.5 5.5 0 0 1 10 6h4a5 5 0 0 1 5 5v1.5c0 1 .6 1.5 1.5 1.5v2c-1.8 0-2.8-.8-3.2-2M7.5 17v-3M16.5 17v-2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="15.6" cy="10.2" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
