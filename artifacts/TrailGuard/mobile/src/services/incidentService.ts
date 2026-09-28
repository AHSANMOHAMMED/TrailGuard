import { v4 as uuidv4 } from 'uuid';
import { IncidentReport } from '../types/models';
import * as LocalStore from '../store/localStore';

export function createIncident(input: {
  parkId: string;
  type: string;
  description: string;
  geo: { lat: number; lng: number };
  locationSource: 'GPS' | 'MANUAL';
  photoUri?: string;
}): IncidentReport {
  const report: IncidentReport = {
    reportId: uuidv4(),
    parkId: input.parkId,
    type: input.type,
    description: input.description,
    geo: input.geo,
    locationSource: input.locationSource,
    observedAt: new Date().toISOString(),
    syncState: 'PENDING',
    attachments: input.photoUri
      ? [{ attachId: uuidv4(), uri: input.photoUri, mimeType: 'image/jpeg' }]
      : [],
  };
  LocalStore.saveIncident(report);
  return report;
}
