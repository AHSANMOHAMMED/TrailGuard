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
import { useField } from "@/lib/store";

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
  const loadDemoDataset = useField((s) => s.loadDemoDataset);
  const pullSharedFromDb = useField((s) => s.pullSharedFromDb);
  const [pullNote, setPullNote] = useState<string | null>(null);
  const [pulling, setPulling] = useState(false);

  async function refreshDbHealth() {
    try {
      const health = await fieldDbHealthFn();
      setDbLabel(health.source === "neon" ? "Neon Postgres" : "PGLite WASM");
      setCounts(health.counts);
      setDbError(null);
    } catch {
      setDbLabel("PGLite local");
      setCounts(null);
      setDbError("Could not reach server — counts unavailable (PGLite local).");
    }
  }

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

  async function onPullShared() {
    setPulling(true);
    setPullNote(null);
    try {
      const r = await pullSharedFromDb();
      await refreshDbHealth();
      setPullNote(
        `Pulled P${r.patrols} I${r.incidents} C${r.conflicts} R${r.radio} A${r.alerts} from shared DB`,
      );
    } catch (e) {
      setPullNote(e instanceof Error ? e.message : "Pull failed");
    } finally {
      setPulling(false);
    }
  }

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
                {" · "}shared by every phone
              </p>
              <p className="mt-1 break-all text-[11px] text-muted">
                Phone API:{" "}
                <span className="font-medium text-fg">/api/v1</span>
                {" "}(set{" "}
                <code className="rounded bg-surface px-1">EXPO_PUBLIC_API_URL</code>
                {" "}to this host + /api/v1)
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
            next sign-in for each actor. PIN credentials are viva-only (not graded).
          </p>
        </div>
        <button
          type="button"
          disabled={pulling}
          onClick={() => void onPullShared()}
          className="w-full rounded-xl border border-border bg-accent px-3 py-2.5 text-left text-[12px] font-semibold text-accent-fg hover:opacity-95 disabled:opacity-50"
        >
          {pulling ? "Pulling…" : "Refresh desk from shared DB"} — show phone-synced Neon rows
        </button>
        {pullNote ? (
          <p className="text-[11px] text-muted">{pullNote}</p>
        ) : null}
        <button
          type="button"
          onClick={() => loadDemoDataset()}
          className="w-full rounded-xl border border-dashed border-border bg-surface px-3 py-2.5 text-left text-[12px] font-semibold text-muted hover:bg-elevated"
        >
          Load demo dataset (viva only) — sample SYNCED patrols / incidents / EL-07 alert
        </button>
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
