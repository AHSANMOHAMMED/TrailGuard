import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Bone,
  Camera,
  Check,
  CircleDashed,
  MoreHorizontal,
  PawPrint,
  Tent,
  Upload,
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
import { useField } from "@/lib/store";
import { fmtClock } from "@/lib/utils";

export const Route = createFileRoute("/incidents")({
  component: () => (
    <Guard area="incidents">
      <IncidentPage />
    </Guard>
  ),
});

/**
 * UC02-S01 — Report Field Incident.
 * Screens follow the hi-fi wireframe panels 1–8 (Figure 10): start → type →
 * photo → details → review → validating submit → offline conditional →
 * submitted. A02 R-09/R-10: mode chip + grouped categories.
 */

type IncidentTypeOption = {
  label: string;
  icon: typeof CircleDashed;
};

/** Flat type list matching Figure 10 hi-fi wireframe. */
const INCIDENT_TYPES: IncidentTypeOption[] = [
  { label: "Snare", icon: CircleDashed },
  { label: "Carcass", icon: Bone },
  { label: "Illegal Campsite", icon: Tent },
  { label: "Footprints", icon: PawPrint },
  { label: "Other", icon: MoreHorizontal },
];

type Step =
  "intro" | "type" | "photo" | "details" | "review" | "submitting" | "offline" | "submitted";

function IncidentPage() {
  const router = useRouter();
  const { online, createIncident, synchronize, incidents } = useField();

  const [step, setStep] = useState<Step>("intro");
  const [type, setType] = useState<string | null>(null);
  const [photoAt, setPhotoAt] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoHash, setPhotoHash] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [gpsAt, setGpsAt] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [locationSource, setLocationSource] = useState<"GPS" | "MANUAL">("GPS");
  const [manualLat, setManualLat] = useState("6.4123");
  const [manualLng, setManualLng] = useState("81.1201");
  const [gpsFailed, setGpsFailed] = useState(false);
  const [checks, setChecks] = useState(0);
  const [wasOffline, setWasOffline] = useState(false);
  const [syncingNow, setSyncingNow] = useState(false);
  /** Demo S3/R-05 — report acked, photo stays PENDING with same attachId. */
  const [partialPhoto, setPartialPhoto] = useState(false);
  const [lastIncidentId, setLastIncidentId] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoName(file.name);
    setPhotoAt(new Date().toISOString());

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (typeof evt.target?.result === "string") {
        setPhotoUrl(evt.target.result);
      }
    };
    reader.readAsDataURL(file);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      setPhotoHash(hashHex);
    } catch {
      setPhotoHash("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    }
  };

  const handleSamplePhoto = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 400;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#3a4a38";
      ctx.fillRect(0, 0, 640, 400);
      ctx.fillStyle = "#63503c";
      ctx.beginPath();
      ctx.moveTo(100, 400);
      ctx.quadraticCurveTo(300, 200, 540, 0);
      ctx.lineTo(640, 0);
      ctx.lineTo(640, 400);
      ctx.fill();
      ctx.strokeStyle = "#d4af37";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(320, 240, 90, 60, -0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "#b08d28";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(390, 210);
      ctx.lineTo(480, 160);
      ctx.stroke();
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(15, 350, 360, 36);
      ctx.fillStyle = "#00ff88";
      ctx.font = "bold 13px monospace";
      ctx.fillText("TRAILGUARD CAM #04 · YALA SECTOR B", 25, 373);
    }
    const sampleDataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setPhotoUrl(sampleDataUrl);
    setPhotoName("SAMPLE_SNARE_CAM04.JPG");
    setPhotoAt(new Date().toISOString());
    setPhotoHash("8f4d92a1c0b3e5f7a9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6");
  };

  // Panel 6 — validation ticks, then route online → upsert-ack → 8, offline → 7.
  useEffect(() => {
    if (step !== "submitting") return;
    setChecks(0);
    const t = setInterval(() => setChecks((c) => c + 1), 350);
    let cancelled = false;
    const done = setTimeout(() => {
      clearInterval(t);
      void (async () => {
        const latN = Number(manualLat);
        const lngN = Number(manualLng);
        const ir = createIncident({
          type: type ?? "Other",
          description,
          locationSource,
          severity,
          lat: locationSource === "MANUAL" && Number.isFinite(latN) ? latN : undefined,
          lng: locationSource === "MANUAL" && Number.isFinite(lngN) ? lngN : undefined,
          hasPhoto: true,
          photoUrl: photoUrl ?? undefined,
          photoHash: photoHash ?? undefined,
          photoName: photoName ?? undefined,
          partialPhoto: online && partialPhoto,
        });
        setLastIncidentId(ir.reportId);
        if (online) {
          // Never claim Submitted until Sync upsert-acks the same UUID.
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
    online,
    type,
    description,
    severity,
    locationSource,
    manualLat,
    manualLng,
    photoUrl,
    photoHash,
    photoName,
    createIncident,
    partialPhoto,
    synchronize,
  ]);

  // Panel 7 → 8 — connectivity returns while the incident is stored locally.
  useEffect(() => {
    if (step !== "offline" || !online) return;
    setSyncingNow(true);
    let cancelled = false;
    const t = setTimeout(() => {
      void (async () => {
        await synchronize().catch(() => undefined);
        if (cancelled) return;
        setSyncingNow(false);
        setStep("submitted");
      })();
    }, 1600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [step, online, synchronize]);

  const photoTime = photoAt ? fmtClock(photoAt) : "";
  const gpsTime = gpsAt ? fmtClock(gpsAt) : "";
  const lastIncident = lastIncidentId
    ? incidents.find((i) => i.reportId === lastIncidentId)
    : undefined;
  const photoStillPending = Boolean(
    lastIncident?.hasPhoto && lastIncident.photoSyncState === "PENDING",
  );
  const fullyAcked =
    lastIncident?.syncState === "SYNCED" && !photoStillPending;

  /* ---------- Panel 1 · Report Field Incident ---------- */
  if (step === "intro") {
    return (
      <Phone>
        <ScreenHeader title="Report Field Incident" onBack="home" />
        <Body>
          <div>
            <h2 className="text-[20px] font-bold tracking-tight">New Field Incident</h2>
            <p className="text-[13px] text-muted">Record an incident encountered during patrol.</p>
          </div>
          <PinMap caption="PATROL ROUTE AB-02" pinLabel="Incident location" />
          <div>
            <p className="mb-1.5 text-[13px] font-semibold">Examples of field incidents</p>
            <div className="grid grid-cols-2 gap-2">
              {INCIDENT_TYPES.slice(0, 4).map(({ label, icon: Icon }) => (
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

  /* ---------- Panel 2 · Incident Type (R-10 grouped chips) ---------- */
  if (step === "type") {
    return (
      <Phone>
        <ScreenHeader title="Incident Type" onBack={() => setStep("intro")}>
          <ModeChip online={online} />
        </ScreenHeader>
        <Body>
          <div>
            <h2 className="text-[18px] font-bold">What did you find?</h2>
            <p className="text-[12.5px] text-muted">Choose the closest category.</p>
          </div>
          <div className="flex flex-col gap-2">
            {INCIDENT_TYPES.map(({ label, icon: Icon }) => (
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
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="relative overflow-hidden rounded-xl border border-border bg-surface">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Captured Incident Evidence"
                className="h-[180px] w-full object-cover"
              />
            ) : (
              <PhotoSketch empty={!photoAt} />
            )}
            {photoAt ? (
              <span className="absolute bottom-2 right-2 rounded bg-fg/75 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                {photoTime} · attached
              </span>
            ) : null}
          </div>

          {photoAt ? (
            <div className="flex flex-col gap-1 rounded-xl border border-ok/30 bg-ok-bg/50 p-2.5">
              <div className="flex items-center gap-2 text-[13px] font-semibold text-ok">
                <span className="flex size-5 items-center justify-center rounded-full bg-ok">
                  <Check className="size-3 text-white" strokeWidth={3} />
                </span>
                Photo Captured & Verified
              </div>
              {photoName ? (
                <p className="truncate text-[11.5px] text-muted">
                  <span className="font-semibold text-fg">File:</span> {photoName}
                </p>
              ) : null}
              {photoHash ? (
                <p className="truncate font-mono text-[11px] text-subtle">
                  <span className="font-semibold text-muted">SHA-256:</span> {photoHash.slice(0, 24)}…
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-[12px] text-muted">
              Select or take a photo of the incident evidence. A SHA-256 hash signature is generated automatically.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <BtnPrimary onClick={() => fileInputRef.current?.click()}>
              <span className="inline-flex items-center gap-2">
                <Camera className="size-4" strokeWidth={2} />
                {photoAt ? "Retake / Choose New Image" : "Take Photo / Choose File"}
              </span>
            </BtnPrimary>
            <BtnOutline onClick={handleSamplePhoto}>
              <span className="inline-flex items-center gap-2">
                <Upload className="size-4" strokeWidth={2} />
                Use Field Camera Sample
              </span>
            </BtnOutline>
          </div>

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
    const locLabel =
      locationSource === "MANUAL"
        ? `${manualLat}° N, ${manualLng}° E (manual)`
        : gpsFailed
          ? "GPS unavailable — switch to manual"
          : `${manualLat}° N, ${manualLng}° E (GPS)`;
    return (
      <Phone>
        <ScreenHeader title="Incident Details" onBack={() => setStep("photo")} />
        <Body>
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">Location</p>
            <Pill tone={gpsFailed && locationSource === "GPS" ? "warn" : "progress"}>
              {locationSource === "MANUAL" ? "MANUAL" : gpsFailed ? "GPS FAIL" : "GPS"}
            </Pill>
          </div>
          <PinMap height={120} />
          <Card>
            <Row k="Source" v={locationSource} strong />
            <Row k="Coordinates" v={locLabel} strong />
            <Row k="Capture time" v={gpsTime || "—"} strong />
          </Card>
          {gpsFailed && locationSource === "GPS" ? (
            <HintCard>
              Automatic GPS could not be obtained (dense canopy). Retry GPS or mark a manual
              coordinate (A01 E1).
            </HintCard>
          ) : null}
          <div className="flex flex-col gap-2">
            <BtnOutline
              onClick={() => {
                setGpsFailed(false);
                setLocationSource("GPS");
                setManualLat("6.4123");
                setManualLng("81.1201");
                setGpsAt(new Date().toISOString());
              }}
            >
              Use GPS location
            </BtnOutline>
            <BtnOutline
              onClick={() => {
                setGpsFailed(true);
                setLocationSource("GPS");
              }}
            >
              Simulate GPS failure
            </BtnOutline>
            <BtnOutline
              onClick={() => {
                setLocationSource("MANUAL");
                setGpsFailed(false);
                setGpsAt(new Date().toISOString());
              }}
            >
              Enter manual lat / lng
            </BtnOutline>
          </div>
          {locationSource === "MANUAL" ? (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[12px]">
                Lat
                <input
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-2 py-2 text-[13px]"
                />
              </label>
              <label className="text-[12px]">
                Lng
                <input
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-2 py-2 text-[13px]"
                />
              </label>
            </div>
          ) : null}
          <div>
            <p className="mb-1 text-[13px] font-semibold">Severity</p>
            <div className="flex flex-wrap gap-2">
              {(["LOW", "MEDIUM", "HIGH"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={
                    severity === s
                      ? "rounded-lg bg-accent px-3 py-1.5 text-[12px] font-semibold text-accent-fg"
                      : "rounded-lg border border-border bg-surface px-3 py-1.5 text-[12px] font-semibold text-muted"
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-[13px] font-semibold">Short Description</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 100))}
              rows={3}
              placeholder="Wire snare found beside animal trail."
              className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-accent"
            />
            <p className="text-right text-[11px] text-subtle">{description.length} / 100</p>
          </div>
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <BtnPrimary
              disabled={
                description.trim().length === 0 ||
                (locationSource === "GPS" && gpsFailed) ||
                (locationSource === "MANUAL" &&
                  (!Number.isFinite(Number(manualLat)) || !Number.isFinite(Number(manualLng))))
              }
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
        <ScreenHeader title="Review Incident" onBack={() => setStep("details")}>
          <ModeChip online={online} />
        </ScreenHeader>
        <Body>
          <p className="text-[14px] font-bold">Check the details before submitting</p>
          <Card className="flex items-center gap-3">
            <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
              {photoUrl ? (
                <img src={photoUrl} alt="" className="size-full object-cover" />
              ) : (
                <PhotoSketch thumb />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold">
                Photograph <span className="font-normal text-muted">· Attached · {photoTime}</span>
              </p>
              {photoHash ? (
                <p className="truncate font-mono text-[10.5px] text-subtle">
                  SHA-256: {photoHash.slice(0, 16)}…
                </p>
              ) : null}
              <p className="truncate text-[12px] text-muted">{type} beside animal trail</p>
            </div>
          </Card>
          <Card>
            <Row k="Incident Type" v={type} strong />
            <Row k="Severity" v={severity} strong />
            <Row
              k="Location"
              v={`${manualLat}° N, ${manualLng}° E (${locationSource})`}
              strong
            />
            <Row k="Captured" v={gpsTime} strong />
          </Card>
          <div>
            <p className="mb-1 text-[12px] font-semibold text-muted">Description</p>
            <Card>
              <p className="text-[13.5px] leading-snug">{description}</p>
            </Card>
          </div>
          {online ? (
            <label className="flex items-start gap-2 rounded-lg border border-dashed border-border bg-surface px-3 py-2 text-[12px] text-muted">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={partialPhoto}
                onChange={(e) => setPartialPhoto(e.target.checked)}
              />
              <span>
                Submit report before photo finishes (UC02 S3): ack the report now; keep the photo
                PENDING with the same attachment id until retry.
              </span>
            </label>
          ) : (
            <HintCard>{CONSEQUENCE.savedOffline}</HintCard>
          )}
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
          <HintCard>{CONSEQUENCE.savedOffline}</HintCard>
          <Pill tone="warn" className="w-fit">
            PENDING SYNCHRONISATION
          </Pill>
          <Card className="flex items-start gap-3">
            <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
              {photoUrl || lastIncident?.photoUrl ? (
                <img
                  src={photoUrl || lastIncident?.photoUrl || undefined}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <PhotoSketch thumb />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-bold">{type}</p>
              <p className="text-[12px] text-muted">8.4123° N, 80.4021° E</p>
              {photoHash || lastIncident?.photoHash ? (
                <p className="truncate font-mono text-[10.5px] text-subtle">
                  SHA-256: {(photoHash || lastIncident?.photoHash)?.slice(0, 16)}…
                </p>
              ) : null}
              <p className="truncate text-[12px] text-muted">{description}</p>
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

  /* ---------- Panel 8 · ack screen (Submitted only after SYNCED) ---------- */
  const title = fullyAcked
    ? wasOffline
      ? "Incident Synchronised"
      : "Incident Submitted"
    : "Incident Saved";
  const heading = fullyAcked
    ? wasOffline
      ? "Incident Synchronised Successfully"
      : "Incident Submitted Successfully"
    : "Saved on this phone";
  const statusPill = fullyAcked
    ? wasOffline
      ? "SYNCHRONISED"
      : "SUBMITTED"
    : "PENDING SYNCHRONISATION";
  const statusRow = fullyAcked
    ? wasOffline
      ? "SYNCHRONISED"
      : "SUBMITTED"
    : photoStillPending && lastIncident?.syncState === "SYNCED"
      ? "REPORT SYNCED · PHOTO PENDING"
      : "PENDING SYNCHRONISATION";

  return (
    <Phone>
      <ScreenHeader title={title} />
      <Body>
        <div className="pt-2">
          <SuccessCheck />
        </div>
        <div className="text-center">
          <h2 className="text-[17px] font-bold">{heading}</h2>
          <p className="text-[12px] text-muted">
            {fullyAcked ? "Linked to your active patrol." : "Will send when Sync acknowledges this id."}
          </p>
          <div className="mt-1.5">
            <Pill tone={fullyAcked ? "ok" : "warn"}>{statusPill}</Pill>
          </div>
        </div>
        <Card>
          <Row k="Incident Type" v={type} strong />
          <Row k="GPS Location" v="8.4123° N, 80.4021° E" strong />
          <Row k="Captured" v={gpsTime} strong />
          <Row
            k="Photo"
            v={photoStillPending ? "PENDING (same attach id)" : "attached"}
            strong
          />
          <Row k="Submission status" v={statusRow} strong />
          {lastIncidentId ? <Row k="Report id" v={lastIncidentId.slice(0, 8)} /> : null}
        </Card>
        {photoStillPending ? (
          <HintCard>
            Partial upload (S3/R-05): report acknowledged; photo keeps the same attach id and
            retries from the sync queue — never a second report id.
          </HintCard>
        ) : (
          <HintCard>{fullyAcked ? CONSEQUENCE.synced : CONSEQUENCE.pendingSync}</HintCard>
        )}
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
