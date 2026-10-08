import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import {
  Body,
  BtnOutline,
  BtnPrimary,
  Card,
  ConfirmNote,
  HintCard,
  Phone,
  Pill,
  RadioRow,
  RiskBanner,
  RiskMap,
  Row,
  ScreenHeader,
  SuccessCheck,
  Tile,
} from "@/components/field";
import { useField } from "@/lib/store";
import { Guard } from "@/components/auth-gate";
import { useAuth } from "@/lib/auth-store";
import { fmtClock } from "@/lib/utils";

export const Route = createFileRoute("/alerts")({
  component: () => (
    <Guard area="alerts">
      <AlertsPage />
    </Guard>
  ),
});

/**
 * UC03-S01 — Monitor Tracked Wildlife and Manage Risk Alerts.
 * Screens follow the hi-fi wireframe panels 1–8 (Figure 14): incoming alert →
 * details → acknowledged → response map → coordination → response in
 * progress → resolve → resolved.
 */

const OUTCOMES = [
  "Animal left the risk zone",
  "Situation monitored – no further risk",
  "Other outcome",
];

type Step =
  | "incoming"
  | "details"
  | "desk"
  | "acknowledged"
  | "respond"
  | "coordination"
  | "inProgress"
  | "resolve"
  | "resolved";

const OFFICERS = [
  { id: "off-mercer", name: "RN-402 Mercer" },
  { id: "off-fernando", name: "Liaison Fernando" },
];

function AlertsPage() {
  const router = useRouter();
  const session = useAuth((s) => s.session);
  const {
    alerts,
    ackAlert,
    resolveAlert,
    resetAlert,
    assignAlert,
    failNotify,
    escalateAlert,
    holdForTriage,
  } = useField();

  // Ranger + Liaison run the field response (Fig 14). Manager runs assign desk (A02).
  const canAct = session?.role === "RANGER" || session?.role === "LIAISON";
  const isManager = session?.role === "MANAGER";

  const [step, setStep] = useState<Step>("incoming");
  const [outcome, setOutcome] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [resolvedAt, setResolvedAt] = useState<string | null>(null);
  const [pickedOfficer, setPickedOfficer] = useState(OFFICERS[0].id);
  const [deskMsg, setDeskMsg] = useState<string | null>(null);

  const alert =
    alerts.find((a) => a.status !== "CLOSED") ?? alerts[0];

  // The demo collar feed raises a fresh alert if the previous one was closed.
  useEffect(() => {
    if (!alert || alert.status === "CLOSED") resetAlert();
  }, [alert, resetAlert]);

  if (!alert) return null;
  const detected = fmtClock(alert.receivedAt);
  const title = `${alert.animal} Near ${alert.zone}`;
  const statusLabel =
    alert.status === "REVIEW"
      ? "REVIEW"
      : alert.status === "ESCALATED"
        ? "ESCALATED"
        : alert.status === "ASSIGNED"
          ? "ASSIGNED"
          : "NEW";

  /* ---------- Panel 1 · Incoming Wildlife Risk Alert ---------- */
  if (step === "incoming") {
    return (
      <Phone>
        <ScreenHeader title="Wildlife Risk Alert" onBack="home" />
        <Body>
          <p className="text-[12px] text-muted">Incoming alert</p>
          <div className="rounded-xl border-2 border-danger bg-danger-bg p-3">
            <div className="flex items-center justify-between">
              <Pill tone="danger">High Risk</Pill>
              <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                {statusLabel}
              </span>
            </div>
            <p className="mt-2 text-[17px] font-bold text-danger">{title}</p>
            <p className="mt-0.5 text-[12px] text-danger/80">
              Tracked Animal {alert.collar} · Risk Zone: {alert.zone}
              <br />
              Detected {detected} · Nagoda east, near canal
            </p>
          </div>
          <Card>
            <Row k="Animal / Collar" v={`${alert.animal} · ${alert.collar}`} strong />
            <Row k="Risk Zone" v={`${alert.zone} (HIGH)`} strong />
            <Row k="Confidence" v={alert.confidence} strong />
            <Row k="Time" v={detected} strong />
            <Row k="Status" v={statusLabel} strong />
          </Card>
          <HintCard>
            No high-risk zone detected → no alert is created (safe zone – conditional).
          </HintCard>
          <HintCard>
            Ranger offline → alert delivered when connectivity returns (conditional).
          </HintCard>
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <BtnPrimary onClick={() => setStep("details")}>View Alert</BtnPrimary>
            {isManager ? (
              <BtnOutline onClick={() => setStep("desk")}>Open assign desk (A02)</BtnOutline>
            ) : null}
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Manager desk · assign / notify-fail / escalate / triage ---------- */
  if (step === "desk") {
    const officer = OFFICERS.find((o) => o.id === pickedOfficer) ?? OFFICERS[0];
    return (
      <Phone>
        <ScreenHeader title="Conflict Desk" onBack={() => setStep("incoming")} />
        <Body>
          <div>
            <h2 className="text-[17px] font-bold">Assign response</h2>
            <p className="text-[12.5px] text-muted">
              Single active assignment · delivery ≠ acknowledgement (R-04 / R-06).
            </p>
          </div>
          <Card>
            <Row k="Alert" v={title} strong />
            <Row k="Status" v={statusLabel} strong />
            <Row k="Assignee" v={alert.assigneeName ?? "—"} strong />
            <Row k="Delivery" v={alert.deliveryState ?? "—"} strong />
            <Row k="Notify attempts" v={String(alert.notifyAttempts ?? 0)} strong />
          </Card>
          <p className="text-[13px] font-semibold">Available officer</p>
          <div className="flex flex-col gap-2">
            {OFFICERS.map((o) => (
              <RadioRow
                key={o.id}
                label={o.name}
                selected={pickedOfficer === o.id}
                onSelect={() => setPickedOfficer(o.id)}
              />
            ))}
          </div>
          {deskMsg ? <HintCard>{deskMsg}</HintCard> : null}
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <BtnPrimary
              onClick={() => {
                assignAlert(alert.alertId, officer);
                setDeskMsg(`Assigned ${officer.name} · notification SENT (delivery only).`);
              }}
            >
              Assign officer
            </BtnPrimary>
            <BtnOutline
              onClick={() => {
                const next = failNotify(alert.alertId);
                setDeskMsg(
                  next === "ESCALATED"
                    ? "Second notify failure → ESCALATED · backup RN-511 notified (R-02b)."
                    : "Notify FAILED · officer freed · alert back to OPEN (R-06).",
                );
              }}
            >
              Simulate notify failure
            </BtnOutline>
            <BtnOutline
              onClick={() => {
                escalateAlert(alert.alertId);
                setDeskMsg("Escalated to backup officer list.");
              }}
            >
              Escalate now
            </BtnOutline>
            <BtnOutline
              onClick={() => {
                holdForTriage(alert.alertId);
                setDeskMsg("Low-confidence triage: held in REVIEW · no paging (R-08).");
              }}
            >
              Hold as low-confidence
            </BtnOutline>
            <BtnOutline
              onClick={() => {
                resetAlert({ confidence: "Low" });
                setDeskMsg("Seeded a LOW confidence alert in REVIEW.");
                setStep("incoming");
              }}
            >
              Seed low-confidence alert
            </BtnOutline>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 2 · Alert Details ---------- */
  if (step === "details") {
    return (
      <Phone>
        <ScreenHeader title="Risk Alert" onBack={() => setStep("incoming")} />
        <Body>
          <RiskBanner
            text={`HIGH RISK - ${alert.animal.toUpperCase()} NEAR ${alert.zone.toUpperCase()}`}
          />
          <div className="flex items-center justify-between">
            <Pill tone="danger">{statusLabel}</Pill>
            <span className="text-[12px] text-muted">Detected {detected}</span>
          </div>
          <div>
            <RiskMap approach={0.08} />
            <p className="mt-1 text-right text-[11px] text-muted">≈ 1.2 km to animal</p>
          </div>
          <Card>
            <Row k="Animal" v={alert.animal} strong />
            <Row k="Collar" v={alert.collar} strong />
            <Row k="Zone" v={alert.zone} strong />
            <Row k="Distance" v="≈ 1.2 km" strong />
            <Row k="Severity" v={<span className="text-danger">HIGH RISK</span>} strong />
          </Card>
          <HintCard>Recent camera-trap image may be attached if available (conditional).</HintCard>
          <div className="mt-auto flex flex-col gap-2 pt-2">
            {canAct && alert.status !== "REVIEW" ? (
              <BtnPrimary
                onClick={() => {
                  ackAlert(alert.alertId);
                  setStep("acknowledged");
                }}
              >
                Acknowledge Alert
              </BtnPrimary>
            ) : isManager ? (
              <BtnPrimary onClick={() => setStep("desk")}>Open assign desk</BtnPrimary>
            ) : alert.status === "REVIEW" ? (
              <HintCard>
                Low-confidence triage — held for manager review; field officers are not paged
                (R-08).
              </HintCard>
            ) : (
              <HintCard>
                Monitoring view — acknowledgement and field response are performed by the Ranger
                and the Community Liaison Officer.
              </HintCard>
            )}
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 3 · Alert Acknowledged ---------- */
  if (step === "acknowledged") {
    return (
      <Phone>
        <ScreenHeader title="Risk Alert" onBack={() => setStep("details")} />
        <Body>
          <div className="flex items-center gap-2">
            <Pill tone="danger">High Risk</Pill>
            <Pill tone="progress">Acknowledged</Pill>
          </div>
          <RiskMap approach={0.15} />
          <ConfirmNote title="ACKNOWLEDGED" sub="You are now responding to this alert" />
          <Card>
            <Row k="Animal" v={`${alert.animal} · ${alert.collar}`} strong />
            <Row k="Zone" v={alert.zone} strong />
            <Row k="Distance" v="≈ 1.2 km" strong />
          </Card>
          <HintCard>
            If not acknowledged in time, the alert may be escalated (conditional).
          </HintCard>
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <BtnPrimary onClick={() => setStep("respond")}>Navigate / Respond</BtnPrimary>
            <BtnOutline onClick={() => setStep("coordination")}>Coordinate with Liaison</BtnOutline>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 4 · Response Map ---------- */
  if (step === "respond") {
    return (
      <Phone>
        <ScreenHeader title="Respond to Risk Alert" onBack={() => setStep("acknowledged")} />
        <Body>
          <div>
            <RiskMap approach={0.45} height={230} />
            <p className="mt-1 text-right text-[11px] text-muted">route toward risk area</p>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone="progress">Acknowledged</Pill>
            <span className="text-[12px] text-muted">Heading NE · Nagoda east field</span>
          </div>
          <div className="flex gap-2">
            <Tile k="Animal" v={alert.animal} />
            <Tile k="Risk Zone" v={alert.zone} />
            <Tile k="Distance" v="≈ 1.2 km" />
          </div>
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <BtnPrimary onClick={() => setStep("coordination")}>Continue Response</BtnPrimary>
            <BtnOutline onClick={() => setStep("acknowledged")}>Back to Alert</BtnOutline>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 5 · Response Coordination ---------- */
  if (step === "coordination") {
    return (
      <Phone>
        <ScreenHeader title="Risk Response" onBack={() => setStep("respond")} />
        <Body>
          <div>
            <h2 className="text-[17px] font-bold">Coordinated response</h2>
            <p className="text-[12.5px] text-muted">Shared response status for this alert.</p>
          </div>
          <Card className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-elevated">
              <UserRound className="size-4.5 text-accent" strokeWidth={2} />
            </span>
            <span>
              <span className="block text-[14px] font-semibold">Ranger</span>
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-ok">
                <span className="size-1.5 rounded-full bg-ok" aria-hidden /> Responding
              </span>
            </span>
          </Card>
          <Card className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-elevated">
              <UserRound className="size-4.5 text-accent" strokeWidth={2} />
            </span>
            <span>
              <span className="block text-[14px] font-semibold">Community Liaison Officer</span>
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-ok">
                <span className="size-1.5 rounded-full bg-ok" aria-hidden /> Notified / Responding
              </span>
            </span>
          </Card>
          <Card>
            <p className="text-[12px] text-muted">Alert Status</p>
            <div className="mt-1 flex items-center justify-between">
              <Pill tone="progress">Acknowledged</Pill>
              <span className="text-[12px] font-semibold">
                {alert.animal} · {alert.collar} · {alert.zone}
              </span>
            </div>
          </Card>
          <p className="text-[11.5px] text-subtle">
            Coordination is shown via shared status only – no messaging.
          </p>
          <div className="mt-auto pt-2">
            <BtnPrimary onClick={() => setStep("inProgress")}>Continue</BtnPrimary>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 6 · Response In Progress ---------- */
  if (step === "inProgress") {
    return (
      <Phone>
        <ScreenHeader title="Risk Response" onBack={() => setStep("coordination")} />
        <Body>
          <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-ok">
            <span className="size-1.5 rounded-full bg-ok" aria-hidden /> Response In Progress
          </p>
          <div>
            <RiskMap approach={0.8} />
            <p className="mt-1 text-right text-[11px] text-muted">animal near risk boundary</p>
          </div>
          <Card>
            <Row k="Animal" v={`${alert.animal} · ${alert.collar}`} strong />
            <Row k="Zone" v={alert.zone} strong />
            <Row k="Current Alert Status" v="ACKNOWLEDGED" strong />
          </Card>
          <p className="text-[12.5px] text-muted">
            Field team monitoring the animal near the risk boundary.
          </p>
          <div className="mt-auto pt-2">
            <BtnPrimary onClick={() => setStep("resolve")}>Resolve Alert</BtnPrimary>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 7 · Resolve Risk Alert ---------- */
  if (step === "resolve") {
    return (
      <Phone>
        <ScreenHeader title="Resolve Risk Alert" onBack={() => setStep("inProgress")} />
        <Body>
          <Card>
            <p className="text-[15px] font-bold">{title}</p>
            <div className="mt-1 flex items-center justify-between">
              <Pill tone="progress">Acknowledged</Pill>
              <span className="text-[12px] text-muted">
                {alert.collar} · {alert.zone}
              </span>
            </div>
          </Card>
          <p className="text-[13px] font-semibold">Outcome / Resolution</p>
          <div className="flex flex-col gap-2">
            {OUTCOMES.map((o) => (
              <RadioRow key={o} label={o} selected={outcome === o} onSelect={() => setOutcome(o)} />
            ))}
          </div>
          <div>
            <p className="mb-1 text-[13px] font-semibold">Resolution note (optional)</p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 160))}
              rows={2}
              placeholder="Animal returned to the park; no damage reported."
              className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2.5 text-[14px] outline-none focus:border-accent"
            />
          </div>
          <div className="mt-auto flex flex-col gap-2 pt-2">
            <BtnPrimary
              disabled={!outcome}
              onClick={() => {
                resolveAlert(alert.alertId, outcome ?? "", note || undefined);
                setResolvedAt(new Date().toISOString());
                setStep("resolved");
              }}
            >
              Mark as Resolved
            </BtnPrimary>
            <BtnOutline onClick={() => setStep("inProgress")}>Cancel</BtnOutline>
          </div>
        </Body>
      </Phone>
    );
  }

  /* ---------- Panel 8 · Alert Resolved ---------- */
  const resolvedLabel = resolvedAt ? fmtClock(resolvedAt) : "";
  return (
    <Phone>
      <ScreenHeader title="Risk Alert" />
      <Body>
        <div className="pt-2">
          <SuccessCheck />
        </div>
        <div className="text-center">
          <Pill tone="ok">Resolved</Pill>
          <h2 className="mt-1.5 text-[18px] font-bold">{title}</h2>
          <p className="text-[12px] text-muted">Resolved {resolvedLabel}</p>
        </div>
        <Card>
          <Row k="Animal" v={`${alert.animal} · ${alert.collar}`} strong />
          <Row k="Risk Zone" v={alert.zone} strong />
          <Row k="Status" v="RESOLVED" strong />
          <Row k="Resolved time" v={resolvedLabel} strong />
        </Card>
        <div>
          <RiskMap approach={0.3} resolvedInside height={140} />
          <p className="mt-1 text-right text-[11px] text-muted">animal back inside the park</p>
        </div>
        <p className="text-[12.5px] text-muted">
          Outcome: {(outcome ?? "").toLowerCase()}
          {note ? `; ${note.toLowerCase()}` : "; no damage reported."}
        </p>
        <div className="mt-auto pt-2">
          <BtnPrimary onClick={() => router.navigate({ to: "/" })}>Done</BtnPrimary>
        </div>
      </Body>
    </Phone>
  );
}
