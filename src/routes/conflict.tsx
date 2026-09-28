import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useField } from "@/lib/store";
import { Can, DeniedNote } from "@/components/role-switcher";
import { fmtClock, fmtTime } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/conflict")({ component: ConflictPage });

function ConflictPage() {
  const { alerts, officers, assignments, ingestCollar, assignOfficer, acknowledge } = useField();

  return (
    <AppShell>
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted">UC03</p>
      <h1 className="mt-1 text-3xl font-medium tracking-tight">Conflict</h1>
      <p className="mt-2 text-sm text-muted">
        Collar reading, risk assessment, assignment, notification, then a separate officer acknowledgement.
      </p>

      <Can
        perm="conflict:ingest"
        fallback={
          <div className="mt-6">
            <DeniedNote>
              Collar ingestion is driven by the Sensor Gateway and managed from the Park Manager
              desk. Your role sees alerts to acknowledge or close below.
            </DeniedNote>
          </div>
        }
      >
        <Button
          className="mt-6 w-full sm:w-auto"
          variant="secondary"
          onClick={() => {
            const a = ingestCollar();
            toast.message(a ? `Alert ${a.alertId} · ${a.zone}` : "No alert");
          }}
        >
          Ingest collar reading
        </Button>
      </Can>

      <div className="mt-4 space-y-3">
        {alerts.map((alert) => {
          const ra = assignments.find((x) => x.alertId === alert.alertId);
          return (
            <Card key={alert.alertId}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>
                    {alert.alertId} · {alert.animal}
                  </CardTitle>
                  <p className="mt-2 text-sm">{alert.zone}</p>
                  <p className="mt-1 font-mono text-[11px] text-subtle">
                    Obs {fmtClock(alert.observedAt)} · Recv {fmtClock(alert.receivedAt)} · {alert.confidence}
                  </p>
                </div>
                <Badge
                  tone={alert.status === "OPEN" ? "warn" : alert.status === "ASSIGNED" ? "accent" : "ok"}
                >
                  {alert.status}
                </Badge>
              </div>

              {alert.status === "OPEN" && (
                <div className="mt-4 space-y-2">
                  <Can
                    perm="conflict:assign"
                    fallback={
                      <DeniedNote>
                        Assignment is a Park Manager action. You will see the response here once
                        assigned.
                      </DeniedNote>
                    }
                  >
                    <>
                      {officers
                        .filter((o) => o.available)
                        .map((o) => (
                          <Button
                            key={o.officerId}
                            variant="secondary"
                            className="w-full justify-between"
                            onClick={() => {
                              const asg = assignOfficer(alert.alertId, o.officerId);
                              toast.message(
                                asg
                                  ? `Assigned ${o.name} · delivery ${asg.deliveryState}`
                                  : "Could not assign",
                              );
                            }}
                          >
                            <span>{o.name}</span>
                            <span className="font-mono text-[10px] uppercase text-muted">{o.role}</span>
                          </Button>
                        ))}
                      {officers.filter((o) => o.available).length === 0 && (
                        <p className="text-sm text-warn">No available officer — leave OPEN and escalate.</p>
                      )}
                    </>
                  </Can>
                </div>
              )}

              {ra && (
                <div className="mt-4 rounded-md bg-elevated p-3">
                  <p className="text-sm">
                    {ra.officerName} · delivery {ra.deliveryState}
                  </p>
                  <p className="mt-1 font-mono text-[11px] text-subtle">
                    Created {fmtTime(ra.createdAt)}
                    {ra.acknowledgedAt ? ` · Ack ${fmtTime(ra.acknowledgedAt)}` : " · awaiting ack"}
                  </p>
                  {!ra.acknowledgedAt && (
                    <Can
                      perm="conflict:acknowledge"
                      fallback={
                        <div className="mt-3">
                          <DeniedNote>
                            Acknowledgement belongs to the assigned Ranger or Liaison Officer.
                          </DeniedNote>
                        </div>
                      }
                    >
                      <Button
                        size="sm"
                        className="mt-3"
                        onClick={() => {
                          acknowledge(ra.raId);
                          toast.success("Acknowledged — distinct from delivery");
                        }}
                      >
                        Officer acknowledge
                      </Button>
                    </Can>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
