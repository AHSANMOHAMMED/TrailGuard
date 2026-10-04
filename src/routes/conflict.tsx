import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, MapPin, MessageSquare, Smartphone, Sprout, Wifi } from "lucide-react";
import {
  Body,
  BtnOutline,
  BtnPrimary,
  Card,
  HintCard,
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
import { useField } from "@/lib/store";
import { fmtClock } from "@/lib/utils";
import type { ConflictReport } from "@/lib/types";

export const Route = createFileRoute("/conflict")({ component: ConflictPage });

/**
 * UC04-S01 — Manage Human-Wildlife Conflict Reports.
 * Screens follow the hi-fi wireframe panels 1–8 (Figure 18): community
 * report → channel → details → review → offline conditional → submitted →
 * staff review → response recorded.
 */

const TYPES = ["Elephant Sighting", "Crop Raiding", "Other Conflict"];
const DEFAULT_LOCATION = "Nagoda east field, near the canal";

type Step =
  | "intro"
  | "channel"
  | "details"
  | "review"
  | "offline"
  | "submitted"
  | "staffReview"
  | "responded";

function ConflictPage() {
  const router = useRouter();
  const { online, createConflict, respondConflict, markConflictSynced } = useField();

  const [step, setStep] = useState<Step>("intro");
  const [channel, setChannel] = useState<"Mobile App" | "SMS">("Mobile App");
  const [type, setType] = useState<string | null>(null);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [description, setDescription] = useState("");
  const [report, setReport] = useState<ConflictReport | null>(null);
  const [wasOffline, setWasOffline] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);

  // Panel 5 → 6 — connectivity returns while the report is stored locally.
  useEffect(() => {
    if (step !== "offline" || !online || !report) return;
    setSyncingNow(true);
    const t = setTimeout(() => {
      markConflictSynced(report.reportId);
      setSyncingNow(false);
      setStep("submitted");
    }, 1500);
    return () => clearTimeout(t);
  }, [step, online, report, markConflictSynced]);

  function onSubmit() {
    const r = createConflict({
      type: type ?? "Other Conflict",
      location,
      channel,
      description,
    });
    setReport(r);
    if (online) {
      setStep("submitted");
    } else {
      setWasOffline(true);
      setStep("offline");
    }
  }

  const receivedLabel = report ? fmtClock(report.receivedAt) : "";

  /* ---------- Panel 1 · Report Wildlife Conflict ---------- */
  if (step === "intro") {
    return (
      <Phone>
        <ScreenHeader title="Report Wildlife Conflict" onBack="home">
          <ConnectivityToggle />
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
          <p className="text-[11.5px] text-subtle">Reports can also be sent by SMS.</p>
          <div className="mt-auto pt-2">
            <BtnPrimary onClick={() => setStep("channel")}>Start Report</BtnPrimary>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 2 · Reporting Channel ---------- */
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
            sub="Text the details to the short code"
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

  /* ---------- Panel 3 · Conflict Details ---------- */
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
          <HintCard>
            By SMS: text the conflict type, location and description to the configured short code.
          </HintCard>
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <BtnPrimary
              disabled={!type || description.trim().length === 0 || location.trim().length === 0}
              onClick={() => setStep("review")}
            >
              Continue
            </BtnPrimary>
            <BtnOutline onClick={() => setStep("channel")}>Back</BtnOutline>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 4 · Review Report ---------- */
  if (step === "review") {
    return (
      <Phone>
        <ScreenHeader title="Review Report" onBack={() => setStep("details")} />
        <Body>
          <p className="text-[14px] font-bold">Check the details before sending</p>
          <Card>
            <Row k="Conflict Type" v={type} strong />
            <Row k="Location" v={location} strong />
            <Row k="Reporting Channel" v={channel} strong />
          </Card>
          <div>
            <p className="mb-1 text-[12px] font-semibold text-muted">Description</p>
            <Card>
              <p className="text-[13.5px] leading-snug">{description}</p>
            </Card>
          </div>
          <PinMap height={120} pinLabel="" />
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <BtnPrimary onClick={onSubmit}>Submit Report</BtnPrimary>
            <BtnOutline onClick={() => setStep("details")}>Edit</BtnOutline>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 5 · Offline Report (conditional) ---------- */
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

  /* ---------- Panel 6 · Report Submitted ---------- */
  if (step === "submitted") {
    return (
      <Phone>
        <ScreenHeader title="Report Submitted" />
        <Body>
          <div className="pt-2">
            <SuccessCheck />
          </div>
          <div className="text-center">
            <h2 className="text-[17px] font-bold">Report Submitted Successfully</h2>
            <p className="text-[12px] text-muted">Wildlife staff will review your report.</p>
          </div>
          <Card>
            <Row k="Conflict Type" v={type} strong />
            <Row k="Location" v={location} strong />
            <Row k="Reporting Channel" v={channel} strong />
          </Card>
          {wasOffline ? (
            <HintCard>
              <span className="font-semibold">Only if previously offline (Screen 5)</span>
              <span className="mt-1 flex items-center gap-1.5 font-semibold text-ok">
                <Wifi className="size-3.5" /> Connection restored · synced automatically
                <span className="ml-auto tabular-nums">1 → 0</span>
              </span>
            </HintCard>
          ) : null}
          <div className="mt-auto pt-2">
            <BtnPrimary onClick={() => setStep("staffReview")}>Done</BtnPrimary>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 7 · Community Report Review (staff) ---------- */
  if (step === "staffReview") {
    return (
      <Phone>
        <ScreenHeader title="Community Conflict Report" onBack={() => setStep("submitted")} />
        <Body>
          <div className="flex items-center justify-between">
            <Pill tone="progress">Submitted</Pill>
            <span className="text-[12px] text-muted">
              Received {receivedLabel} · {channel}
            </span>
          </div>
          {report?.highPriority ? (
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
            <Row k="Conflict Type" v={type} strong />
            <Row k="Location" v={location} strong />
            <Row k="Reporting Channel" v={channel} strong />
            <Row k="Report Status" v="SUBMITTED" strong />
          </Card>
          <div>
            <p className="mb-1 text-[12px] font-semibold text-muted">Description</p>
            <Card>
              <p className="text-[13.5px] leading-snug">{description}</p>
            </Card>
          </div>
          <PinMap height={110} pinLabel="" caption="Near park boundary" />
          <p className="text-[11.5px] text-subtle">
            Reviewing as Ranger / Community Liaison Officer
          </p>
          <div className="mt-auto pt-2">
            <BtnPrimary
              onClick={() => {
                if (report) respondConflict(report.reportId);
                setStep("responded");
              }}
            >
              Respond to Report
            </BtnPrimary>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 8 · Response Recorded ---------- */
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
              Updated{" "}
              {report?.respondedAt
                ? fmtClock(report.respondedAt)
                : fmtClock(new Date().toISOString())}
            </span>
          </span>
        </Card>
        <Card>
          <Row k="Responder" v="Ranger / Community Liaison Officer" strong />
          <Row k="Conflict Type" v={type} strong />
          <Row k="Location" v={location} strong />
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
        <PinMap height={110} pinLabel="" />
        <div className="mt-auto pt-2">
          <BtnPrimary onClick={() => router.navigate({ to: "/" })}>Done</BtnPrimary>
        </div>
      </Body>
    </Phone>
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
