/** Assigned NB-03 route anchors (Yala Northern Boundary). */

export const YALA_ROUTE = {
  id: "NB-03",
  name: "North Boundary Patrol",
  sector: "Northern park boundary",
  /** Figure 6 panel 1 distance. */
  distanceKm: 4.2,
  estTime: "3 h",
  gainM: 120,
  assignedAt: "06:00",
  details: "Northern park boundary, 4.2 km loop. Return to NB gate on completion.",
  start: { lat: 6.401, lng: 81.118 },
  end: { lat: 6.466, lng: 81.142 },
} as const;

/** Interpolated demo GPS along the route for `t` in [0,1]. */
export function routePointAt(t: number): { lat: number; lng: number } {
  const c = Math.max(0, Math.min(1, t));
  return {
    lat: YALA_ROUTE.start.lat + (YALA_ROUTE.end.lat - YALA_ROUTE.start.lat) * c,
    lng: YALA_ROUTE.start.lng + (YALA_ROUTE.end.lng - YALA_ROUTE.start.lng) * c,
  };
}

/** Rough park bounds used by OfflineFieldMap / Google Maps fit. */
export const YALA_BOUNDS = {
  south: 6.25,
  west: 81.05,
  north: 6.55,
  east: 81.45,
  center: { lat: 6.42, lng: 81.13 },
} as const;

/** High-risk farmland polygon (demo UC03) near eastern boundary. */
export const RISK_ZONE_PATH: Array<{ lat: number; lng: number }> = [
  { lat: 6.43, lng: 81.14 },
  { lat: 6.44, lng: 81.155 },
  { lat: 6.425, lng: 81.16 },
  { lat: 6.415, lng: 81.145 },
];
