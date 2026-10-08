/**
 * Shared Field Sync client — every phone → one TrailGuard /api/v1 host.
 *
 * Resolution order:
 * 1. Runtime URL saved in SQLite (Settings on Home)
 * 2. EXPO_PUBLIC_API_URL / app.config extra.apiUrl baked at build time
 */
import { getSetting, setSetting } from '../store/localStore';

const BUILD_DEFAULT = (() => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants').default as {
      expoConfig?: { extra?: { apiUrl?: string } };
    };
    return Constants?.expoConfig?.extra?.apiUrl?.trim()?.replace(/\/$/, '') ?? '';
  } catch {
    return '';
  }
})();

/** Current API base (runtime override wins). */
export function getApiBaseOrEmpty(): string {
  const runtime = getSetting('api_base')?.trim().replace(/\/$/, '') ?? '';
  return runtime || BUILD_DEFAULT;
}

export function isApiConfigured(): boolean {
  return getApiBaseOrEmpty().length > 0;
}

export function getApiBase(): string {
  const base = getApiBaseOrEmpty();
  if (!base) {
    throw new Error(
      'Set the shared API URL on Home (e.g. https://host/api/v1) so every phone syncs to one DB.'
    );
  }
  return base;
}

/** Persist a runtime API base (and clear with empty string to fall back to build default). */
export function setApiBase(url: string) {
  const cleaned = url.trim().replace(/\/$/, '');
  setSetting('api_base', cleaned);
}

export function getBuildDefaultApiBase(): string {
  return BUILD_DEFAULT;
}

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
