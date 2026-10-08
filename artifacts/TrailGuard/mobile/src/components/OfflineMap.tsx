import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getRecentWaypoints, getWaypointsForPatrol } from '../store/localStore';
import type { GeoPoint, Waypoint } from '../types/models';

type Props = {
  patrolId?: string;
  /** In-memory points (e.g. active patrol) override DB lookup when provided */
  livePoints?: GeoPoint[];
};

function formatPolyline(points: GeoPoint[]): string {
  if (points.length === 0) return 'No track yet — record waypoints on patrol.';
  if (points.length === 1) {
    const p = points[0];
    return `Point: ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
  }
  return points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join(' → ');
}

export default function OfflineMap({ patrolId, livePoints }: Props) {
  const [stored, setStored] = useState<Waypoint[]>([]);

  useEffect(() => {
    if (livePoints && livePoints.length > 0) return;
    if (patrolId) {
      setStored(getWaypointsForPatrol(patrolId));
    } else {
      setStored(getRecentWaypoints(40));
    }
  }, [patrolId, livePoints]);

  const points: GeoPoint[] = useMemo(() => {
    if (livePoints && livePoints.length > 0) return livePoints;
    return stored.map((w) => w.geo);
  }, [livePoints, stored]);

  const polyline = formatPolyline(points);

  return (
    <View style={styles.box} accessibilityLabel="Offline map">
      <Text style={styles.label}>Offline map</Text>
      <Text style={styles.hint}>Track (lat, lng) — no network required</Text>
      <Text style={styles.polyline} numberOfLines={6}>
        {polyline}
      </Text>
      <Text style={styles.meta}>{points.length} point{points.length === 1 ? '' : 's'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#141E18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E5038',
    padding: 14,
    marginBottom: 14,
  },
  label: { color: '#E6F0E6', fontSize: 15, fontWeight: '700', marginBottom: 4 },
  hint: { color: '#8A9E8E', fontSize: 12, marginBottom: 8 },
  polyline: { color: '#A8C4A8', fontSize: 12, lineHeight: 18, fontFamily: 'monospace' },
  meta: { color: '#D97706', fontSize: 11, marginTop: 8 },
});
