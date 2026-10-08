import { upsertIncident, upsertPatrol } from "./idempotency";
import type { IncidentReport, Patrol } from "./model";

/**
 * In-memory "server" used by the field store's sync path. Upserts by stable
 * UUID so offline → online → sync → sync again never creates a second row.
 * Not persisted — it models ConservationAPI for the demo / unit tests.
 */

export interface MirrorConflict {
  reportId: string;
  type: string;
  location: string;
  channel: string;
  description: string;
  syncState: "SYNCED";
}

export interface MirrorRadio {
  messageId: string;
  channel: string;
  syncState: "SYNCED";
}

let patrols: Patrol[] = [];
let incidents: IncidentReport[] = [];
let conflicts: MirrorConflict[] = [];
let radio: MirrorRadio[] = [];

export function mirrorReset(): void {
  patrols = [];
  incidents = [];
  conflicts = [];
  radio = [];
}

export function mirrorCounts(): {
  patrols: number;
  incidents: number;
  conflicts: number;
  radio: number;
} {
  return {
    patrols: patrols.length,
    incidents: incidents.length,
    conflicts: conflicts.length,
    radio: radio.length,
  };
}

export function mirrorUpsertPatrol(incoming: Patrol): { created: boolean } {
  const result = upsertPatrol(patrols, { ...incoming, syncState: "SYNCED" });
  patrols = result.list;
  return { created: result.created };
}

export function mirrorUpsertIncident(incoming: IncidentReport): { created: boolean } {
  const result = upsertIncident(incidents, { ...incoming, syncState: "SYNCED" });
  incidents = result.list;
  return { created: result.created };
}

export function mirrorUpsertConflict(incoming: MirrorConflict): { created: boolean } {
  const idx = conflicts.findIndex((c) => c.reportId === incoming.reportId);
  if (idx === -1) {
    conflicts = [{ ...incoming, syncState: "SYNCED" }, ...conflicts];
    return { created: true };
  }
  conflicts = conflicts.map((c, i) =>
    i === idx ? { ...c, ...incoming, syncState: "SYNCED" as const } : c,
  );
  return { created: false };
}

export function mirrorUpsertRadio(incoming: MirrorRadio): { created: boolean } {
  const idx = radio.findIndex((m) => m.messageId === incoming.messageId);
  if (idx === -1) {
    radio = [{ ...incoming, syncState: "SYNCED" }, ...radio];
    return { created: true };
  }
  radio = radio.map((m, i) =>
    i === idx ? { ...m, ...incoming, syncState: "SYNCED" as const } : m,
  );
  return { created: false };
}

export function mirrorHasPatrol(patrolId: string): boolean {
  return patrols.some((p) => p.patrolId === patrolId);
}

export function mirrorHasIncident(reportId: string): boolean {
  return incidents.some((i) => i.reportId === reportId);
}
