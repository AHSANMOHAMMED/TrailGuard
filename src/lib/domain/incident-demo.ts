/** UC02 field-incident demo helpers (Ahsan). */

export function incidentAckTitle(fullyAcked: boolean, wasOffline: boolean): string {
  if (!fullyAcked) return "Incident Saved";
  return wasOffline ? "Incident Synchronised" : "Incident Submitted";
}

export function incidentStatusRow(opts: {
  fullyAcked: boolean;
  wasOffline: boolean;
  photoStillPending: boolean;
  reportSynced: boolean;
}): string {
  if (opts.fullyAcked) return opts.wasOffline ? "SYNCHRONISED" : "SUBMITTED";
  if (opts.photoStillPending && opts.reportSynced) return "REPORT SYNCED · PHOTO PENDING";
  return "PENDING SYNC";
}

export function photoAttachId(reportId: string): string {
  return `${reportId}-photo`;
}
