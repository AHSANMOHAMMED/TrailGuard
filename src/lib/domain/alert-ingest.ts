/**
 * UC03 collar → geofence → risk alert (ported from backend conflict_service).
 * Pure domain: no I/O. Web UI calls this instead of inventing alerts ad-hoc.
 */

export type CollarConfidence = "High" | "Medium" | "Low";

export type CollarReading = {
  animal: string;
  collar: string;
  lat: number;
  lng: number;
  observedAt: string;
  confidence: CollarConfidence;
};

export type RiskZone = {
  zoneId: string;
  name: string;
  /** Axis-aligned box for demo geofence (Yala farmland strip). */
  south: number;
  north: number;
  west: number;
  east: number;
};

/** Default Yala farmland buffer used in UC03 demos (EL-07). */
export const YALA_FARMLAND: RiskZone = {
  zoneId: "zone-farmland",
  name: "Farmland",
  south: 6.35,
  north: 6.5,
  west: 81.05,
  east: 81.25,
};

export type ExistingAlertRef = {
  alertId: string;
  animal: string;
  zone: string;
  status: string;
};

export type IngestDecision =
  | { kind: "ignore"; reason: "outside_zone" | "stale" }
  | {
      kind: "create" | "refresh";
      alertId: string;
      animal: string;
      collar: string;
      zone: string;
      confidence: CollarConfidence;
      triage: "PAGE" | "REVIEW_QUEUE";
      status: "OPEN" | "REVIEW";
      observedAt: string;
      receivedAt: string;
    };

function inZone(lat: number, lng: number, zone: RiskZone): boolean {
  return (
    lat >= zone.south &&
    lat <= zone.north &&
    lng >= zone.west &&
    lng <= zone.east
  );
}

/** Readings older than this are logged only (no new page). */
export const FRESH_WINDOW_MS = 30 * 60 * 1000;

/**
 * Assess one collar fix against a risk zone and optional open alerts.
 * Dedup: same animal + zone refreshes the open alert instead of minting another.
 */
export function ingestAndAssess(
  reading: CollarReading,
  zone: RiskZone,
  existing: ExistingAlertRef[],
  nowMs: number = Date.now(),
): IngestDecision {
  const observedMs = Date.parse(reading.observedAt);
  const fresh =
    Number.isFinite(observedMs) && nowMs - observedMs <= FRESH_WINDOW_MS;
  if (!fresh) return { kind: "ignore", reason: "stale" };
  if (!inZone(reading.lat, reading.lng, zone)) {
    return { kind: "ignore", reason: "outside_zone" };
  }

  const open = existing.find(
    (a) =>
      a.animal === reading.animal &&
      a.zone === zone.name &&
      a.status !== "CLOSED",
  );

  const triage: "PAGE" | "REVIEW_QUEUE" =
    reading.confidence === "Low" ? "REVIEW_QUEUE" : "PAGE";
  const status = triage === "REVIEW_QUEUE" ? "REVIEW" : "OPEN";
  const receivedAt = new Date(nowMs).toISOString();

  if (open) {
    return {
      kind: "refresh",
      alertId: open.alertId,
      animal: reading.animal,
      collar: reading.collar,
      zone: zone.name,
      confidence: reading.confidence,
      triage,
      status,
      observedAt: reading.observedAt,
      receivedAt,
    };
  }

  return {
    kind: "create",
    alertId: `AL-${Math.floor(20 + Math.random() * 80)}`,
    animal: reading.animal,
    collar: reading.collar,
    zone: zone.name,
    confidence: reading.confidence,
    triage,
    status,
    observedAt: reading.observedAt,
    receivedAt,
  };
}

/** Demo collar fix that always lands inside YALA_FARMLAND. */
export function demoCollarReading(
  confidence: CollarConfidence = "High",
): CollarReading {
  return {
    animal: "Elephant",
    collar: "EL-07",
    lat: 6.41,
    lng: 81.12,
    observedAt: new Date().toISOString(),
    confidence,
  };
}
