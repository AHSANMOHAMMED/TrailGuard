/** UC04 conservation report demo helpers (Kajana). */

export function pendingExcludedLabel(count: number): string {
  if (count <= 0) return "pending excluded: 0";
  return `pending excluded: ${count}`;
}

export function snapshotEmptyMessage(): string {
  return "No SYNCED records in this window — PENDING stays on device until Sync ack.";
}

export function exportFilename(reportId: string): string {
  return `trailguard-${reportId.slice(0, 8)}.csv`;
}
