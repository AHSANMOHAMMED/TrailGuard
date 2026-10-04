import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bone,
  Camera,
  Check,
  CircleDashed,
  MoreHorizontal,
  PawPrint,
  Tent,
  Wifi,
} from "lucide-react";
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

export const Route = createFileRoute("/incidents")({ component: IncidentPage });

/**
 * UC02-S01 — Report Field Incident.
 * Screens follow the hi-fi wireframe panels 1–8 (Figure 10): start → type →
 * photo → details → review → validating submit → offline conditional →
 * submitted.
 */

const TYPES = [
  { label: "Snare", icon: CircleDashed },
  { label: "Carcass", icon: Bone },
  { label: "Illegal Campsite", icon: Tent },
  { label: "Footprints", icon: PawPrint },
  { label: "Other", icon: MoreHorizontal },
] as const;

type Step =
  "intro" | "type" | "photo" | "details" | "review" | "submitting" | "offline" | "submitted";

function IncidentPage() {
  const router = useRouter();
  const { online, createIncident, synchronize } = useField();

  const [step, setStep] = useState<Step>("intro");
  const [type, setType] = useState<string | null>(null);
  const [photoAt, setPhotoAt] = useState<string | null>(null);
  const [gpsAt, setGpsAt] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [checks, setChecks] = useState(0);
  const [wasOffline, setWasOffline] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);

  // Panel 6 — validation ticks, then route online → 8, offline → 7.
  useEffect(() => {
    if (step !== "submitting") return;
    setChecks(0);
    const t = setInterval(() => setChecks((c) => c + 1), 350);
    const done = setTimeout(() => {
      clearInterval(t);
      createIncident({
        type: type ?? "Other",
        description,
        locationSource: "GPS",
        hasPhoto: true,
      });
      if (online) {
        setStep("submitted");
      } else {
        setWasOffline(true);
        setStep("offline");
      }
    }, 2100);
    return () => {
      clearInterval(t);
      clearTimeout(done);
    };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Panel 7 → 8 — connectivity returns while the incident is stored locally.
  useEffect(() => {
    if (step !== "offline" || !online) return;
    setSyncingNow(true);
    const t = setTimeout(() => {
      void synchronize().catch(() => undefined);
      setSyncingNow(false);
      setStep("submitted");
    }, 1600);
    return () => clearTimeout(t);
  }, [step, online, synchronize]);

  const photoTime = photoAt ? fmtClock(photoAt) : "";
  const gpsTime = gpsAt ? fmtClock(gpsAt) : "";

  /* ---------- Panel 1 · Report Field Incident ---------- */
  if (step === "intro") {
    return (
      <Phone>
        <ScreenHeader title="Report Field Incident" onBack="home">
          <ConnectivityToggle />
        </ScreenHeader>
        <Body>
          <div>
            <h2 className="text-[20px] font-bold tracking-tight">New Field Incident</h2>
            <p className="text-[13px] text-muted">Record an incident encountered during patrol.</p>
          </div>
          <PinMap caption="current patrol position" />
          <div>
            <p className="mb-1.5 text-[13px] font-semibold">Examples of field incidents</p>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.slice(0, 4).map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5"
                >
                  <Icon className="size-4 text-accent" strokeWidth={2} />
                  <span className="text-[13px] font-semibold">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[11.5px] text-subtle">
            Photo and GPS location are captured in the field.
          </p>
          <div className="mt-auto pt-2">
            <BtnPrimary onClick={() => setStep("type")}>Start Report</BtnPrimary>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 2 · Incident Type ---------- */
  if (step === "type") {
    return (
      <Phone>
        <ScreenHeader title="Incident Type" onBack={() => setStep("intro")} />
        <Body>
          <div>
            <h2 className="text-[18px] font-bold">What did you find?</h2>
            <p className="text-[12.5px] text-muted">Choose the closest category.</p>
          </div>
          <div className="flex flex-col gap-2">
            {TYPES.map(({ label, icon: Icon }) => (
              <RadioRow
                key={label}
                label={label}
                icon={<Icon className="size-4" strokeWidth={2} />}
                selected={type === label}
                onSelect={() => setType(label)}
              />
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <BtnPrimary disabled={!type} onClick={() => setStep("photo")}>
              Continue
            </BtnPrimary>
            <BtnOutline onClick={() => setStep("intro")}>Cancel</BtnOutline>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 3 · Capture Photograph ---------- */
  if (step === "photo") {
    return (
      <Phone>
        <ScreenHeader title="Incident Photo" onBack={() => setStep("type")} />
        <Body>
          <div className="relative overflow-hidden rounded-xl border border-border">
            <PhotoSketch empty={!photoAt} />
            {photoAt ? (
              <span className="absolute bottom-2 right-2 rounded bg-fg/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {photoTime} · attached
              </span>
            ) : null}
          </div>
          {photoAt ? (
            <p className="flex items-center gap-2 text-[13px] font-semibold text-ok">
              <span className="flex size-5 items-center justify-center rounded-full bg-ok">
                <Check className="size-3 text-white" strokeWidth={3} />
              </span>
              Photo Captured
            </p>
          ) : null}
          <BtnOutline onClick={() => setPhotoAt(new Date().toISOString())}>
            <span className="inline-flex items-center gap-2">
              <Camera className="size-4" strokeWidth={2} />
              {photoAt ? "Retake" : "Capture Photo"}
            </span>
          </BtnOutline>
          <div className="mt-auto pt-2">
            <BtnPrimary
              disabled={!photoAt}
              onClick={() => {
                setGpsAt(new Date().toISOString());
                setStep("details");
              }}
            >
              Continue
            </BtnPrimary>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 4 · Incident Details ---------- */
  if (step === "details") {
    return (
      <Phone>
        <ScreenHeader title="Incident Details" onBack={() => setStep("photo")} />
        <Body>
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">GPS Location</p>
            <Pill tone="progress">Captured</Pill>
          </div>
          <PinMap height={120} />
          <Card>
            <Row k="Latitude" v="8.4123° N" strong />
            <Row k="Longitude" v="80.4021° E" strong />
            <Row k="Capture time" v={gpsTime} strong />
          </Card>
          <div>
            <p className="mb-1 text-[13px] font-semibold">Short Description</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 160))}
              rows={3}
              placeholder="Wire snare found beside animal trail."
              className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-accent"
            />
            <p className="text-right text-[11px] text-subtle">{description.length} / 160</p>
          </div>
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <BtnPrimary
              disabled={description.trim().length === 0}
              onClick={() => setStep("review")}
            >
              Continue
            </BtnPrimary>
            <BtnOutline onClick={() => setStep("photo")}>Back</BtnOutline>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 5 · Review Incident ---------- */
  if (step === "review") {
    return (
      <Phone>
        <ScreenHeader title="Review Incident" onBack={() => setStep("details")} />
        <Body>
          <p className="text-[14px] font-bold">Check the details before submitting</p>
          <Card className="flex items-center gap-3">
            <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-border">
              <PhotoSketch thumb />
            </div>
            <div>
              <p className="text-[13px] font-semibold">
                Photograph <span className="font-normal text-muted">· Attached · {photoTime}</span>
              </p>
              <p className="text-[12px] text-muted">{type} beside animal trail</p>
            </div>
          </Card>
          <Card>
            <Row k="Incident Type" v={type} strong />
            <Row k="GPS Location" v="8.4123° N, 80.4021° E" strong />
            <Row k="Captured" v={gpsTime} strong />
          </Card>
          <div>
            <p className="mb-1 text-[12px] font-semibold text-muted">Description</p>
            <Card>
              <p className="text-[13.5px] leading-snug">{description}</p>
            </Card>
          </div>
          <HintCard>
            Edit returns to the relevant step before final submission (alternative flow).
          </HintCard>
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <BtnPrimary onClick={() => setStep("submitting")}>Submit Incident</BtnPrimary>
            <BtnOutline onClick={() => setStep("type")}>Edit</BtnOutline>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 6 · Submit Incident (validation) ---------- */
  if (step === "submitting") {
    const items = ["Incident type", "Photograph", "GPS location", "Description"];
    return (
      <Phone>
        <ScreenHeader title="Submit Incident" />
        <Body>
          <div className="flex justify-center pt-6">
            <Spinner />
          </div>
          <p className="text-center text-[14px] font-semibold">Validating required information…</p>
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
                    {checks > i ? <Check className="size-3 text-white" strokeWidth={3} /> : null}
                  </span>
                  {label}
                </span>
                <span className="text-[11px] text-subtle">{checks > i ? "present" : ""}</span>
              </div>
            ))}
          </Card>
          <div>
            <p className="text-[13px] font-semibold">Submitting incident…</p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-elevated">
              <div
                className="h-full rounded-full bg-ok transition-all duration-500"
                style={{ width: `${Math.min(100, checks * 25)}%` }}
              />
            </div>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 7 · Offline Incident (conditional) ---------- */
  if (step === "offline") {
    return (
      <Phone>
        <ScreenHeader title="Field Incident">
          <ConnectivityToggle />
        </ScreenHeader>
        <Body>
          <OfflineBanner text="Incident Stored Locally" />
          <Pill tone="warn" className="w-fit">
            Pending Synchronisation
          </Pill>
          <Card className="flex items-start gap-3">
            <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-border">
              <PhotoSketch thumb />
            </div>
            <div>
              <p className="text-[14px] font-bold">{type}</p>
              <p className="text-[12px] text-muted">8.4123° N, 80.4021° E</p>
              <p className="text-[12px] text-muted">{description}</p>
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-muted">Pending Synchronisation</span>
              <span className="text-[17px] font-bold tabular-nums">1</span>
            </div>
            <p className="text-[12px] text-muted">Will synchronize when connectivity returns.</p>
          </Card>
          <HintCard>
            <span className="font-semibold">Conditional – when connectivity returns</span>
            {syncingNow ? (
              <span className="mt-1 flex items-center gap-1.5 font-semibold text-ok">
                <Wifi className="size-3.5" /> Connection restored · synchronizing…
                <span className="ml-auto tabular-nums">1 → 0</span>
              </span>
            ) : (
              <span className="mt-1 block">
                Shown only when there is no network at submit time.
              </span>
            )}
          </HintCard>
          <div className="mt-auto pt-2">
            <BtnOutline onClick={() => router.navigate({ to: "/" })}>OK</BtnOutline>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 8 · Incident Submitted ---------- */
  return (
    <Phone>
      <ScreenHeader title="Incident Submitted" />
      <Body>
        <div className="pt-2">
          <SuccessCheck />
        </div>
        <div className="text-center">
          <h2 className="text-[17px] font-bold">Incident Submitted Successfully</h2>
          <p className="text-[12px] text-muted">Linked to your active patrol.</p>
          <div className="mt-1.5">
            <Pill tone="ok">{wasOffline ? "Synchronised" : "Submitted"}</Pill>
          </div>
        </div>
        <Card>
          <Row k="Incident Type" v={type} strong />
          <Row k="GPS Location" v="8.4123° N, 80.4021° E" strong />
          <Row k="Captured" v={gpsTime} strong />
          <Row k="Photo" v="attached" strong />
          <Row k="Submission status" v={wasOffline ? "SYNCHRONISED" : "SUBMITTED"} strong />
        </Card>
        <PinMap height={130} caption="Incident recorded on patrol NB-03" />
        <div className="mt-auto pt-2">
          <BtnPrimary onClick={() => router.navigate({ to: "/" })}>Continue Patrol</BtnPrimary>
        </div>
      </Body>
    </Phone>
  );
}

/** Sketch of the captured evidence photo (wire snare beside the trail). */
function PhotoSketch({ empty, thumb }: { empty?: boolean; thumb?: boolean }) {
  return (
    <svg
      viewBox="0 0 358 200"
      className="block w-full"
      style={{ height: thumb ? 48 : 180 }}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={empty ? "Camera preview" : "Captured incident photo"}
    >
      <rect width="358" height="200" fill={empty ? "#dad5c3" : "#cfc9b4"} />
      <path d="M0 60 Q 90 30 180 52 T 358 40" fill="none" stroke="#a8a28b" strokeWidth="3" />
      <path d="M0 150 q 60 -14 120 0 t 120 0 t 118 0 v 50 H 0 Z" fill="#bdb79f" />
      {!empty ? (
        <g stroke="#55503e" strokeWidth="3" fill="none" strokeLinecap="round">
          <ellipse cx="185" cy="118" rx="36" ry="26" transform="rotate(-14 185 118)" />
          <path d="M218 100 L 268 76" />
          <g strokeWidth="2" opacity="0.65">
            <path d="M80 164 l 10 -14" />
            <path d="M96 166 l 8 -12" />
            <path d="M260 160 l 10 -14" />
            <path d="M278 162 l 8 -12" />
          </g>
        </g>
      ) : (
        <g fill="#8d886f">
          <circle cx="179" cy="100" r="22" fill="none" stroke="#8d886f" strokeWidth="3" />
          <circle cx="179" cy="100" r="8" />
        </g>
      )}
    </svg>
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
