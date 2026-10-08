/**
 * One shared backend for every phone.
 * Point EXPO_PUBLIC_API_URL at the deployed TrailGuard host + `/api/v1`
 * (same Neon/PGLite field_* DB the web app uses). Example:
 *   EXPO_PUBLIC_API_URL=https://your-trailguard.example.com/api/v1
 */
function resolveBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';
  if (fromEnv) return fromEnv;
  try {
    // Expo Constants (optional) — app.config.js extra.apiUrl
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants').default as {
      expoConfig?: { extra?: { apiUrl?: string } };
    };
    return Constants?.expoConfig?.extra?.apiUrl?.trim() ?? '';
  } catch {
    return '';
  }
}

const BASE = resolveBase();

/** True when a shared API base is configured (required for multi-phone sync). */
export function isApiConfigured(): boolean {
  return BASE.length > 0;
}

export function getApiBase(): string {
  if (!isApiConfigured()) {
    throw new Error(
      'Set EXPO_PUBLIC_API_URL to the shared TrailGuard API (https://<deployed-host>/api/v1) so every phone syncs to one DB.'
    );
  }
  return BASE.replace(/\/$/, '');
}

/** GET /health — confirms shared backend + DB source + park-wide counts. */
export async function fetchSharedHealth() {
  const base = getApiBase();
  const res = await fetch(`${base}/health`);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{
    app: string;
    status: string;
    shared: boolean;
    source: string;
    counts: Record<string, number>;
  }>;
}

export async function upsert(kind: 'patrol' | 'incident' | 'conflict', payload: object) {
  const base = getApiBase();
  const res = await fetch(`${base}/sync/upsert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, payload }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<{ id: string; version: number; complete: boolean }>;
}

export async function generateReport(parkId: string, dateFrom: string, dateTo: string) {
  const base = getApiBase();
  const res = await fetch(`${base}/reports/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ park_id: parkId, date_from: dateFrom, date_to: dateTo }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
