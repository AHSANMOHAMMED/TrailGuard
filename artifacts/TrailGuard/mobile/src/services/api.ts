const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api/v1';

export async function upsert(kind: 'patrol' | 'incident', payload: object) {
  const res = await fetch(`${BASE}/sync/upsert`, {
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
  const res = await fetch(`${BASE}/reports/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ park_id: parkId, date_from: dateFrom, date_to: dateTo }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
