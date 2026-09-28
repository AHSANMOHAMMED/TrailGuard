/**
 * Geo value objects (A02 R-03: GeoPoint/GeoPolygon become real types instead
 * of ad-hoc lat/lng pairs scattered through the model).
 */

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoPolygon {
  vertices: GeoPoint[];
}

/** Great-circle distance in kilometres (haversine). */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Ray-casting point-in-polygon test. The empty polygon contains nothing. */
export function polygonContains(poly: GeoPolygon, p: GeoPoint): boolean {
  const v = poly.vertices;
  let inside = false;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
    const xi = v[i].lat;
    const yi = v[i].lng;
    const xj = v[j].lat;
    const yj = v[j].lng;
    const intersects =
      yi > p.lng !== yj > p.lng &&
      p.lat < ((xj - xi) * (p.lng - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Total length of a polyline of waypoints, in km. */
export function trackLengthKm(points: GeoPoint[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i++) sum += distanceKm(points[i - 1], points[i]);
  return sum;
}
