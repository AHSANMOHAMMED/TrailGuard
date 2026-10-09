import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getRecentWaypoints, getWaypointsForPatrol } from '../store/localStore';
import type { GeoPoint, Waypoint } from '../types/models';
import { getColors, subscribeTheme } from '../theme';

export type MapMode = 'overview' | 'patrol' | 'incident' | 'alert' | 'conflict';

type Props = {
  patrolId?: string;
  livePoints?: GeoPoint[];
  mode?: MapMode;
  customHeading?: string;
  incidentLocation?: string;
  alertAnimal?: string;
  conflictLocation?: string;
};

export default function OfflineMap({
  patrolId,
  livePoints,
  mode = 'overview',
  customHeading,
  incidentLocation = '8.4123° N, 80.4021° E',
  alertAnimal = 'Elephant · EL-07',
  conflictLocation = 'Nagoda east field, near canal',
}: Props) {
  const [stored, setStored] = useState<Waypoint[]>([]);
  const [, bump] = useState(0);
  useEffect(() => subscribeTheme(() => bump((n) => n + 1)), []);
  const c = getColors();

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

  return (
    <View
      style={[
        styles.box,
        { backgroundColor: c.surface, borderColor: c.border },
      ]}
      accessibilityLabel="Offline Field Map"
    >
      {/* Top Map Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.mapTitle, { color: c.fg }]}>
            {customHeading ??
              (mode === 'patrol'
                ? 'Route NB-03 · North Boundary'
                : mode === 'incident'
                ? 'Field Incident Location'
                : mode === 'alert'
                ? 'High-Risk Farmland Zone'
                : mode === 'conflict'
                ? 'Community Boundary Map'
                : 'Yala North Wildlife Map')}
          </Text>
          <Text style={[styles.mapSub, { color: c.muted }]}>
            Offline Vector Map · No Network Required
          </Text>
        </View>
        <View style={[styles.compass, { borderColor: c.border, backgroundColor: c.elevated }]}>
          <Text style={[styles.compassText, { color: c.primary }]}>▲ N</Text>
        </View>
      </View>

      {/* Visual Canvas Area */}
      <View style={[styles.canvas, { backgroundColor: c.bg, borderColor: c.border }]}>
        {/* Background Grids / Terrain Contours */}
        <View style={styles.gridOverlay}>
          <View style={[styles.contourLine1, { borderColor: c.border }]} />
          <View style={[styles.contourLine2, { borderColor: c.border }]} />
        </View>

        {/* Mode: PATROL */}
        {mode === 'patrol' && (
          <View style={StyleSheet.absoluteFill}>
            {/* Planned route arc */}
            <View style={[styles.plannedArc, { borderColor: c.secondary }]} />
            {/* Start & End Gates */}
            <View style={[styles.gatePin, styles.startGate, { backgroundColor: c.primary }]}>
              <Text style={styles.gatePinText}>START</Text>
            </View>
            <View style={[styles.gatePin, styles.endGate, { backgroundColor: c.fg }]}>
              <Text style={styles.gatePinText}>END</Text>
            </View>
            {/* Recorded Waypoint Dots */}
            <View style={[styles.waypointDot, { top: 50, left: 110, backgroundColor: c.secondary }]} />
            <View style={[styles.waypointDot, { top: 75, left: 160, backgroundColor: c.secondary }]} />
            <View style={[styles.waypointDot, { top: 90, left: 220, backgroundColor: c.secondary }]} />
            {/* Active Position / You Pin */}
            <View style={[styles.youPin, { top: 85, left: 215, backgroundColor: c.primary, borderColor: c.surface }]}>
              <View style={styles.youPulse} />
            </View>
            <View style={[styles.youLabel, { top: 105, left: 205 }]}>
              <Text style={[styles.youLabelText, { color: c.primary }]}>● You</Text>
            </View>
          </View>
        )}

        {/* Mode: INCIDENT */}
        {mode === 'incident' && (
          <View style={StyleSheet.absoluteFill}>
            <View style={[styles.plannedArc, { borderColor: c.border }]} />
            {/* Incident Pin */}
            <View style={[styles.markerPin, { top: 60, left: '50%', transform: [{ translateX: -14 }], backgroundColor: c.danger }]}>
              <Text style={styles.markerPinIcon}>⚠️</Text>
            </View>
            <View style={[styles.incidentBadge, { backgroundColor: c.surface, borderColor: c.danger, top: 100, alignSelf: 'center' }]}>
              <Text style={[styles.incidentBadgeText, { color: c.danger }]}>Incident: {incidentLocation}</Text>
            </View>
          </View>
        )}

        {/* Mode: ALERT */}
        {mode === 'alert' && (
          <View style={StyleSheet.absoluteFill}>
            {/* High-Risk Farmland Geofence Zone */}
            <View style={[styles.riskZoneBox, { backgroundColor: 'rgba(220, 38, 38, 0.12)', borderColor: c.danger }]}>
              <Text style={[styles.riskZoneLabel, { color: c.danger }]}>HIGH-RISK ZONE · FARMLAND</Text>
            </View>
            {/* Animal Collar Pin */}
            <View style={[styles.collarPin, { top: 65, left: '60%', backgroundColor: c.danger }]}>
              <Text style={styles.collarPinText}>EL-07</Text>
            </View>
            {/* Distance indicator */}
            <View style={[styles.distanceLine, { borderColor: c.danger }]} />
            <View style={[styles.distanceBadge, { backgroundColor: c.surface, borderColor: c.border, top: 95, left: '30%' }]}>
              <Text style={[styles.distanceBadgeText, { color: c.fg }]}>≈ 1.2 km to animal</Text>
            </View>
          </View>
        )}

        {/* Mode: CONFLICT */}
        {mode === 'conflict' && (
          <View style={StyleSheet.absoluteFill}>
            {/* Boundary canal line */}
            <View style={[styles.canalLine, { borderColor: '#3B82F6' }]} />
            <Text style={[styles.canalLabel, { color: '#3B82F6' }]}>Nagoda Canal & Boundary</Text>
            {/* Village Settlement area */}
            <View style={[styles.villagePerimeter, { borderColor: c.warn, backgroundColor: 'rgba(217, 119, 6, 0.08)' }]}>
              <Text style={[styles.villageLabel, { color: c.warn }]}>Village Settlement</Text>
            </View>
            {/* Sighting Pin */}
            <View style={[styles.markerPin, { top: 55, left: 180, backgroundColor: c.warn }]}>
              <Text style={styles.markerPinIcon}>📍</Text>
            </View>
          </View>
        )}

        {/* Mode: OVERVIEW */}
        {mode === 'overview' && (
          <View style={StyleSheet.absoluteFill}>
            <View style={[styles.plannedArc, { borderColor: c.primary }]} />
            <View style={[styles.startGate, { backgroundColor: c.primary }]}>
              <Text style={styles.gatePinText}>NB-GATE</Text>
            </View>
            <View style={[styles.riskZoneBoxSmall, { borderColor: c.warn }]}>
              <Text style={[styles.riskZoneLabelSmall, { color: c.warn }]}>Farmland</Text>
            </View>
          </View>
        )}

        {/* Map Scale indicator */}
        <View style={[styles.scaleBox, { borderColor: c.muted }]}>
          <Text style={[styles.scaleText, { color: c.muted }]}>500 m</Text>
        </View>
      </View>

      {/* Footer Track Summary */}
      <View style={styles.footerRow}>
        <Text style={[styles.legendText, { color: c.muted }]}>
          {mode === 'patrol'
            ? `Points recorded: ${points.length} · Capture: GPS / MANUAL`
            : mode === 'alert'
            ? `${alertAnimal} · Detected near Nagoda east boundary`
            : mode === 'incident'
            ? `Coordinates locked · Ready for attachment`
            : mode === 'conflict'
            ? `Location: ${conflictLocation}`
            : `Yala Sector North · Offline tiles active`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  mapTitle: { fontSize: 13, fontWeight: '800' },
  mapSub: { fontSize: 10, fontWeight: '600' },
  compass: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  compassText: { fontSize: 10, fontWeight: '800' },
  canvas: {
    height: 145,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  contourLine1: {
    position: 'absolute',
    top: 20,
    left: -20,
    right: -20,
    height: 80,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 60,
  },
  contourLine2: {
    position: 'absolute',
    bottom: -10,
    left: 20,
    right: 20,
    height: 70,
    borderTopWidth: 1,
    borderStyle: 'dotted',
    borderRadius: 40,
  },
  plannedArc: {
    position: 'absolute',
    top: 30,
    left: 40,
    width: 220,
    height: 80,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 60,
  },
  gatePin: {
    position: 'absolute',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  startGate: { top: 85, left: 30 },
  endGate: { top: 20, right: 30 },
  gatePinText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  waypointDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  youPin: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  youPulse: {
    flex: 1,
    borderRadius: 7,
  },
  youLabel: { position: 'absolute' },
  youLabelText: { fontSize: 10, fontWeight: '800' },
  markerPin: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerPinIcon: { fontSize: 13 },
  incidentBadge: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  incidentBadgeText: { fontSize: 10, fontWeight: '700' },
  riskZoneBox: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 160,
    height: 80,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 6,
  },
  riskZoneLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  riskZoneBoxSmall: {
    position: 'absolute',
    top: 25,
    right: 25,
    width: 80,
    height: 45,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 6,
    padding: 4,
  },
  riskZoneLabelSmall: { fontSize: 8, fontWeight: '700' },
  collarPin: {
    position: 'absolute',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  collarPinText: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  distanceLine: {
    position: 'absolute',
    top: 75,
    left: 80,
    width: 130,
    borderTopWidth: 1,
    borderStyle: 'dashed',
  },
  distanceBadge: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  distanceBadgeText: { fontSize: 9, fontWeight: '700' },
  canalLine: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    borderTopWidth: 2,
  },
  canalLabel: {
    position: 'absolute',
    bottom: 24,
    left: 12,
    fontSize: 9,
    fontWeight: '700',
  },
  villagePerimeter: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 140,
    height: 70,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 6,
    padding: 4,
  },
  villageLabel: { fontSize: 9, fontWeight: '700' },
  scaleBox: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    borderBottomWidth: 2,
    paddingHorizontal: 4,
  },
  scaleText: { fontSize: 8, fontWeight: '700' },
  footerRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendText: { fontSize: 11, fontWeight: '600' },
});
