import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Database, Shield } from "lucide-react";
import { Body, Phone, Pill, ScreenHeader, Card } from "@/components/field";
import { Guard } from "@/components/auth-gate";
import {
  ACTORS,
  accessFor,
  useAuth,
  type ActorRole,
  type Area,
} from "@/lib/auth-store";
import { fieldDbHealthFn } from "@/lib/domain/conservation-api";

export const Route = createFileRoute("/admin")({
  component: () => (
    <Guard area="admin">
      <AdminPage />
    </Guard>
  ),
});

const TOGGLE_AREAS: Area[] = [
  "patrol",
  "incidents",
  "alerts",
  "conflict",
  "reports",
  "radio",
];

type FieldCounts = {
  patrols: number;
  incidents: number;
  conflicts: number;
  radio: number;
  alerts: number;
};

function AdminPage() {
  const roleAccess = useAuth((s) => s.roleAccess);
  const setRoleAccess = useAuth((s) => s.setRoleAccess);
  const staff = ACTORS.filter((a) => a.role !== "SUPER_ADMIN");

  const [dbLabel, setDbLabel] = useState<string>("…");
  const [counts, setCounts] = useState<FieldCounts | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const health = await fieldDbHealthFn();
        if (cancelled) return;
        setDbLabel(health.source === "neon" ? "Neon Postgres" : "PGLite WASM");
        setCounts(health.counts);
        setDbError(null);
      } catch {
        if (cancelled) return;
        setDbLabel("PGLite local");
        setCounts(null);
        setDbError("Could not reach server — counts unavailable (PGLite local).");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(role: ActorRole, area: Area) {
    const current = accessFor(role, roleAccess);
    const next = current.includes(area)
      ? current.filter((a) => a !== area)
      : [...current, area];
    setRoleAccess(role, next);
  }

  return (
    <Phone>
      <ScreenHeader title="Role admin" onBack="home">
        <Pill tone="ok">Super Admin</Pill>
      </ScreenHeader>
      <Body>
        <Card>
          <div className="flex items-start gap-2">
            <Database className="mt-0.5 size-4 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold">Database &amp; sync</p>
              <p className="mt-0.5 text-[12px] text-muted">
                Backend: <span className="font-medium text-fg">{dbLabel}</span>
              </p>
              {dbError ? (
                <p className="mt-1 text-[11px] text-warn">{dbError}</p>
              ) : counts ? (
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                  <dt className="text-muted">Patrols</dt>
                  <dd className="font-semibold tabular-nums">{counts.patrols}</dd>
                  <dt className="text-muted">Incidents</dt>
                  <dd className="font-semibold tabular-nums">{counts.incidents}</dd>
                  <dt className="text-muted">Conflicts</dt>
                  <dd className="font-semibold tabular-nums">{counts.conflicts}</dd>
                  <dt className="text-muted">Radio</dt>
                  <dd className="font-semibold tabular-nums">{counts.radio}</dd>
                  <dt className="text-muted">Alerts</dt>
                  <dd className="font-semibold tabular-nums">{counts.alerts}</dd>
                </dl>
              ) : null}
            </div>
          </div>
        </Card>
        <div className="flex items-start gap-2 rounded-xl border border-border bg-elevated px-3 py-2.5">
          <Shield className="mt-0.5 size-4 text-accent" />
          <p className="text-[12px] leading-snug text-muted">
            Divide park roles offline. Changes stay on this device and apply on
            next sign-in for each actor. PIN demo credentials stay the same.
          </p>
        </div>
        {staff.map((actor) => {
          const access = accessFor(actor.role, roleAccess);
          return (
            <Card key={actor.role}>
              <p className="text-[14px] font-semibold">{actor.title}</p>
              <p className="text-[11px] text-muted">{actor.persona} · PIN {actor.pin}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TOGGLE_AREAS.map((area) => {
                  const on = access.includes(area);
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => toggle(actor.role, area)}
                      className={
                        on
                          ? "rounded-lg bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-fg"
                          : "rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted"
                      }
                    >
                      {area}
                    </button>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </Body>
    </Phone>
  );
}
