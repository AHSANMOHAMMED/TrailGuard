import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, SyncBadge } from "@/components/app-shell";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useField } from "@/lib/store";
import { Can, DeniedNote } from "@/components/role-switcher";
import { fmtTime } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/incidents")({ component: IncidentsPage });

const TYPES = ["Snare", "Crop-raid", "Poaching sign", "Injured animal", "Other"];

function IncidentsPage() {
  const { incidents, createIncident, online } = useField();
  const [type, setType] = useState("Snare");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState<"GPS" | "MANUAL">("MANUAL");
  const [photo, setPhoto] = useState(true);

  function save() {
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }
    const ir = createIncident({
      type,
      description: description.trim(),
      locationSource: source,
      hasPhoto: photo,
    });
    setDescription("");
    // R-09 (H5): consequence language first, ID demoted to secondary
    toast.success(
      online
        ? `Report saved — it will send now and show “Submitted” when the server confirms.`
        : `Report saved on this phone — it will send automatically when you have signal.`,
      { description: `Ref ${ir.reportId.slice(0, 8)}` },
    );
  }

  return (
    <AppShell>
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted">UC02</p>
      <h1 className="mt-1 text-3xl font-medium tracking-tight">Incidents</h1>
      <p className="mt-2 text-sm text-muted">
        Capture a report without coverage. Status stays PENDING until complete-receipt on sync.
      </p>

      <Card className="mt-6">
        <CardTitle>New report</CardTitle>
        <Can
          perm="incident:create"
          fallback={
            <div className="mt-4">
              <DeniedNote>
                Field capture is a Ranger action — the Park Manager reviews camera-trap images
                instead. Switch roles in the header to file a report.
              </DeniedNote>
            </div>
          }
        >
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="type">Category</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={
                    type === t
                      ? "min-h-11 rounded-md bg-accent px-3 text-sm text-accent-fg"
                      : "min-h-11 rounded-md border border-border px-3 text-sm text-muted"
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              className="mt-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Wire snare near dry creek track"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={source === "GPS" ? "default" : "secondary"} onClick={() => setSource("GPS")}>
              GPS
            </Button>
            <Button
              type="button"
              size="sm"
              variant={source === "MANUAL" ? "default" : "secondary"}
              onClick={() => setSource("MANUAL")}
            >
              Manual location
            </Button>
            <Button type="button" size="sm" variant={photo ? "default" : "secondary"} onClick={() => setPhoto(!photo)}>
              {photo ? "Photo attached" : "No photo"}
            </Button>
          </div>
          <Button className="w-full" onClick={save}>
            Save report
          </Button>
        </div>
        </Can>
      </Card>

      <h2 className="mt-8 text-sm font-medium text-muted">On device</h2>
      <ul className="mt-3 space-y-2">
        {incidents.map((i) => (
          <li key={i.reportId} className="rounded-lg border border-border bg-surface px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{i.type}</p>
              <SyncBadge state={i.syncState} />
            </div>
            <p className="mt-1 text-sm text-muted">{i.description}</p>
            <p className="mt-1 font-mono text-[11px] text-subtle">
              {fmtTime(i.observedAt)} · {i.locationSource}
              {i.hasPhoto ? " · photo" : ""}
            </p>
          </li>
        ))}
      </ul>
    </AppShell>
  );
}
