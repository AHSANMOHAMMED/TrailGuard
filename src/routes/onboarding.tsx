import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  Camera,
  CheckCircle2,
  MapPinned,
  RefreshCw,
  Shield,
  Siren,
} from "lucide-react";
import { Body, BtnPrimary, Phone, RouteMap } from "@/components/field";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

/**
 * Product tour displaying features inside TrailGuard.
 */
const STEPS = [
  {
    title: "Welcome to TrailGuard",
    body: "Field ops for Yala National Park. TrailGuard equips field units with offline-first tracking, encrypted incident reporting, and real-time risk triage.",
    icon: Shield,
    features: [
      "Works 100% offline in deep canopy & dead zones",
      "Syncs instantly when network coverage returns",
      "Embedded vector maps stay usable without internet",
    ],
  },
  {
    title: "Ranger Patrol Subsystem",
    body: "Start assigned routes, log continuous GPS tracks and manual waypoints, verify route coverage, and queue sync records automatically.",
    icon: MapPinned,
    features: [
      "Assigned route tracking (e.g. Yala Sector AB-02)",
      "Instant undo for mistaken waypoint markers",
      "Automatic exponential backoff on upload failure",
    ],
    showMap: true,
  },
  {
    title: "Incidents & Photo Verification",
    body: "Capture field evidence (snares, carcasses, illegal camps) with camera upload, cryptographic SHA-256 hash verification, and geotagged metadata.",
    icon: Camera,
    features: [
      "Camera & file upload with real-time preview",
      "Automated SHA-256 cryptographic hash badge",
      "Partial upload branch (ack report text, retry photo)",
    ],
  },
  {
    title: "Risk Alerts & Conflict Desk",
    body: "GPS collar geofence triggers HIGH RISK alerts. Receive community SMS and mobile conflict reports, assign officers, and record outcomes.",
    icon: Siren,
    features: [
      "Real-time collar geofence risk alert triage",
      "SMS Shortcode intake & community conflict desk",
      "VHF Field Radio push-to-talk across 3 channels",
    ],
  },
  {
    title: "Offline Save & UUID Sync",
    body: "Every action is stored locally on-device as PENDING. Toggle online/offline mode to test field dead zones, then Sync to upsert by stable UUID.",
    icon: RefreshCw,
    features: [
      "Zero data loss during unexpected signal drops",
      "Visible retry queue with backoff countdowns",
      "Conservation snapshots over SYNCED records only",
    ],
  },
] as const;

function OnboardingPage() {
  const [step, setStep] = useState(0);
  const completeOnboarding = useAuth((s) => s.completeOnboarding);
  const router = useRouter();
  const current = STEPS[step];
  const Icon = current.icon;

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    completeOnboarding();
    void router.navigate({ to: "/" });
  }

  return (
    <Phone>
      <div className="relative overflow-hidden bg-[#163c2c] text-center text-white">
        <div className="absolute right-3 top-3 z-20">
          <ThemeToggle tone="dark" />
        </div>
        <div className="relative aspect-[16/8] w-full overflow-hidden">
          <img
            src="/brand/trailguard-logo.jpg"
            alt="TrailGuard Hero"
            className="size-full object-cover object-center brightness-90"
            width={780}
            height={390}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-[#163c2c]/40 to-[#163c2c]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 pt-1">
            <span className="font-mono text-[9.5px] font-bold tracking-[0.25em] text-[#a0dfb8] uppercase">
              YALA NATIONAL PARK FIELD OPS
            </span>
            <h1 className="mt-0.5 text-[24px] font-extrabold tracking-tight text-white drop-shadow">
              TRAILGUARD
            </h1>
          </div>
        </div>
        {/* Wave separator */}
        <div className="h-4 w-full bg-surface [clip-path:ellipse(60%_100%_at_50%_100%)]" />
      </div>

      <Body className="justify-between pt-1">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-accent">
              Step {step + 1} of {STEPS.length}
            </span>
            <div className="flex items-center gap-1">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={
                    i === step ? "h-1.5 w-4 rounded-full bg-accent" : "size-1.5 rounded-full bg-border"
                  }
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Icon className="size-6" strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-[17px] font-bold tracking-tight">{current.title}</h2>
              <p className="text-[11.5px] text-muted">Feature System Overview</p>
            </div>
          </div>

          <p className="text-[12.5px] leading-relaxed text-muted px-1">{current.body}</p>

          {"showMap" in current && current.showMap ? (
            <RouteMap progress={0.45} height={140} />
          ) : null}

          <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wide text-subtle">
              Inside Features
            </p>
            {current.features.map((f) => (
              <div key={f} className="flex items-start gap-2.5 text-[12px] font-medium leading-snug text-fg">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-accent" strokeWidth={2.5} />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-3">
          <BtnPrimary onClick={next}>
            {step === STEPS.length - 1 ? "Continue to Sign In" : "Next Feature"}
          </BtnPrimary>
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="h-[42px] w-full text-[13px] font-semibold text-muted hover:text-fg"
            >
              Previous
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                completeOnboarding();
                void router.navigate({ to: "/" });
              }}
              className="h-[42px] w-full text-[13px] font-semibold text-subtle hover:text-muted"
            >
              Skip tour & sign in
            </button>
          )}
        </div>
      </Body>
    </Phone>
  );
}
