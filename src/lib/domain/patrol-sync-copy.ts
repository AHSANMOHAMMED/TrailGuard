/** UC01 copy strings for sync states shown on the completion screen. */
export function patrolSyncStatusLabel(state: "PENDING" | "FAILED" | "SYNCED"): string {
  if (state === "SYNCED") return "Synchronized";
  if (state === "FAILED") return "Sync failed — retry from the queue";
  return "Pending — synchronizing shortly";
}

export function patrolSyncHint(state: "PENDING" | "FAILED" | "SYNCED"): string {
  if (state === "SYNCED") {
    return "Server acknowledged · idempotent upsert by patrol ID";
  }
  if (state === "FAILED") {
    return "Kept on this phone · same UUID will retry";
  }
  return "Saved on this phone · queued for the ConservationAPI upsert";
}
