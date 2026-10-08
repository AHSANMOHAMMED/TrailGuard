const BASE = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';

/** True when EXPO_PUBLIC_API_URL is set (required for server sync). */
export function isApiConfigured(): boolean {
  return BASE.length > 0;
}

export function getApiBase(): string {
  if (!isApiConfigured()) {
    throw new Error(
      'TODO: set EXPO_PUBLIC_API_URL to your TrailGuard API base (e.g. https://host/api/v1) before syncing.'
    );
  }
  return BASE.replace(/\/$/, '');
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
