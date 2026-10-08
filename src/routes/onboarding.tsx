import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Footprints, MapPinned, RefreshCw, Siren, Waves } from "lucide-react";
import { Body, BtnPrimary, Phone, RouteMap, ScreenHeader } from "@/components/field";
import { useAuth } from "@/lib/auth-store";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

/**
 * Product tour only — no role picking here.
 * Every user chooses their account on the login screen after this.
 */
const STEPS = [
  {
    title: "Welcome to TrailGuard",
    body: "Field ops for Yala National Park. This short tour shows what is inside the app — next you will sign in with your user ID and field PIN.",
    icon: Waves,
    features: [
      "Works fully offline on this phone",
      "Sync when coverage returns",
      "Maps stay usable without network tiles",
    ],
  },
  {
    title: "Ranger Patrol",
    body: "Start an assigned route, capture GPS and manual waypoints, finish coverage, and queue sync if you were offline.",
    icon: MapPinned,
    features: [
      "Start / cover / complete patrol NB-03",
      "Undo a mistaken waypoint",
      "Retry failed uploads one record at a time",
    ],
    showMap: true,
  },
  {
    title: "Incidents & risk alerts",
    body: "Log snares, crop-raids, and other field finds with optional photo. Wildlife risk alerts walk you from HIGH RISK through acknowledge to resolve.",
    icon: Footprints,
    features: [
      "Field incident report + photo pending sync",
      "HIGH RISK collar alerts (e.g. EL-07)",
      "Assign, escalate, and close with outcome",
    ],
  },
  {
    title: "Conflict, radio & reports",
    body: "Community conflict reports, VHF field radio, and conservation snapshots for the ops desk.",
    icon: Siren,
    features: [
      "Community conflict submit (app or SMS)",
      "Field radio on OPS / EMG / CMN channels",
      "Reports over SYNCED records only + export",
    ],
  },
  {
    title: "Offline save → Sync",
    body: "Every write lands on this device first as PENDING. Flip the Online/Offline control to practice dead zones, then Sync to upsert by the same UUID.",
    icon: RefreshCw,
    features: [
      "No blank screens when coverage drops",
      "Offline map tiles stay on device",
      "Same UUID upserted when Sync runs",
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
      <ScreenHeader title="What's inside" />
      <Body className="justify-between">
        <div className="flex flex-col gap-4 pt-2">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <Icon className="size-7" strokeWidth={2} />
          </div>
          <div className="text-center">
            <p className="font-mono text-[10px] uppercase tracking-wider text-subtle">
              Step {step + 1} of {STEPS.length}
            </p>
            <h2 className="mt-1 text-[20px] font-bold tracking-tight">{current.title}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">{current.body}</p>
          </div>
          {"showMap" in current && current.showMap ? (
            <RouteMap progress={0.45} height={150} />
          ) : null}
          <ul className="flex flex-col gap-2 rounded-xl border border-border bg-surface px-3 py-3">
            {current.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-[12.5px] leading-snug text-fg">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                {f}
              </li>
            ))}
          </ul>
          {step === STEPS.length - 1 ? (
            <p className="text-center text-[12px] text-muted">
              Next: open the <span className="font-semibold text-fg">Login</span> screen and enter
              your user ID + 4-digit field PIN.
            </p>
          ) : null}
          <div className="flex justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={
                  i === step ? "h-1.5 w-5 rounded-full bg-accent" : "size-1.5 rounded-full bg-border"
                }
              />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="h-[44px] w-full text-[13px] font-semibold text-muted"
            >
              Back
            </button>
          ) : null}
          <BtnPrimary onClick={next}>
            {step === STEPS.length - 1 ? "Continue to login" : "Continue"}
          </BtnPrimary>
          <button
            type="button"
            onClick={() => {
              completeOnboarding();
              void router.navigate({ to: "/" });
            }}
            className="h-[44px] w-full text-[13px] font-semibold text-muted"
          >
            Skip tour
          </button>
        </div>
      </Body>
    </Phone>
  );
}
