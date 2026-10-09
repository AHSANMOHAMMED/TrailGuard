import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Modal } from 'react-native';
import OfflineMap from '../components/OfflineMap';
import * as PatrolService from '../services/patrolService';
import { countPendingSync } from '../store/localStore';
import type { GeoPoint } from '../types/models';
import { getSession } from '../session';
import { getColors, subscribeTheme } from '../theme';

type PatrolStep =
  | 'assigned'
  | 'in_progress'
  | 'mark_waypoint'
  | 'offline_view'
  | 'syncing_view'
  | 'completed';

export default function PatrolScreen({
  navigation,
}: {
  navigation: { replace: (r: string) => void; navigate: (r: string) => void };
}) {
  const session = getSession();
  const [, bump] = useState(0);
  useEffect(() => subscribeTheme(() => bump((n) => n + 1)), []);
  const c = getColors();

  const [step, setStep] = useState<PatrolStep>('assigned');
  const [patrolId, setPatrolId] = useState<string | null>(null);
  const [positionsCount, setPositionsCount] = useState(1);
  const [elapsedTime, setElapsedTime] = useState('0 h 05 m');
  const [livePoints, setLivePoints] = useState<GeoPoint[]>([{ lat: 8.4123, lng: 80.4021 }]);
  const [pendingCount, setPendingCount] = useState(countPendingSync());
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [waypointToast, setWaypointToast] = useState(false);
  const [syncCountdown, setSyncCountdown] = useState(7);

  useEffect(() => {
    if (!session) {
      navigation.replace('Login');
      return;
    }
    if (!session.access.includes('patrol')) {
      navigation.replace('Home');
    }
  }, [session, navigation]);

  if (!session || !session.access.includes('patrol')) return null;

  const officerId = session.userId || session.role;

  const handleStartPatrol = () => {
    const p = PatrolService.startPatrol('NB-03', officerId);
    setPatrolId(p.patrolId);
    setPositionsCount(1);
    setElapsedTime('0 h 05 m');
    setLivePoints([{ lat: 8.4123, lng: 80.4021 }]);
    setPendingCount(countPendingSync());
    setStep('in_progress');
  };

  const handleAddLivePoint = () => {
    const nextLat = 8.4123 + positionsCount * 0.0012;
    const nextLng = 80.4021 + positionsCount * 0.0015;
    const pt = { lat: nextLat, lng: nextLng };
    PatrolService.recordPoint(pt, 'GPS');
    setLivePoints((prev) => [...prev, pt]);
    setPositionsCount((n) => n + 1);
  };

  const handleSaveManualWaypoint = () => {
    const pt = { lat: 8.4123, lng: 80.4021 };
    PatrolService.recordPoint(pt, 'MANUAL');
    setLivePoints((prev) => [...prev, pt]);
    setPositionsCount((n) => n + 1);
    setWaypointToast(true);
    setTimeout(() => {
      setWaypointToast(false);
      setStep('in_progress');
    }, 1200);
  };

  const handleTriggerOffline = () => {
    setStep('offline_view');
  };

  const handleTriggerOnlineSync = () => {
    setStep('syncing_view');
    setSyncCountdown(7);
    const timer = setInterval(() => {
      setSyncCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 2;
      });
    }, 800);
  };

  const handleCompletePatrol = () => {
    setShowConfirmModal(false);
    try {
      PatrolService.completePatrol();
    } catch {
      // safe fallback
    }
    setStep('completed');
  };

  return (
    <ScrollView style={[styles.wrap, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      {/* 1. ASSIGNED PATROL DETAILS */}
      {step === 'assigned' && (
        <View>
          <View style={styles.topHeader}>
            <Text style={[styles.subHeading, { color: c.muted }]}>Assigned Patrol Route</Text>
            <View style={[styles.badge, { backgroundColor: 'rgba(31, 90, 67, 0.12)' }]}>
              <Text style={[styles.badgeText, { color: c.primary }]}>● ASSIGNED</Text>
            </View>
          </View>

          <Text style={[styles.h1, { color: c.fg }]}>North Boundary Patrol</Text>

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>PatrolRoute</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>NB-03</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Distance</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>7.4 km</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Assigned Time</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>06:30 today</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, { color: c.fg }]}>Route Preview</Text>
          <OfflineMap mode="patrol" livePoints={livePoints} patrolId={patrolId ?? undefined} />

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.cardTitle, { color: c.fg }]}>Patrol Details</Text>
            <Text style={[styles.cardBody, { color: c.muted }]}>
              Northern park boundary, 7.4 km loop. Return to NB gate on completion.
            </Text>
          </View>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={handleStartPatrol}
          >
            <Text style={styles.primaryBtnText}>Start Patrol</Text>
          </Pressable>
        </View>
      )}

      {/* 2 & 3. PATROL IN PROGRESS & LIVE GPS TRACKING */}
      {step === 'in_progress' && (
        <View>
          <View style={styles.statusBanner}>
            <View style={[styles.badge, { backgroundColor: 'rgba(31, 90, 67, 0.12)' }]}>
              <Text style={[styles.badgeText, { color: c.primary }]}>● IN PROGRESS</Text>
            </View>
            <Text style={[styles.statusMeta, { color: c.muted }]}>Started 06:40 · Route NB-03</Text>
          </View>

          <View style={[styles.subBadge, { backgroundColor: c.elevated }]}>
            <Text style={[styles.subBadgeText, { color: c.primary }]}>❖ GPS Tracking Active</Text>
          </View>

          <OfflineMap mode="patrol" livePoints={livePoints} />

          <View style={[styles.statsRow, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: c.fg }]}>{positionsCount}</Text>
              <Text style={[styles.statLabel, { color: c.muted }]}>Positions Recorded</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: c.fg }]}>{elapsedTime}</Text>
              <Text style={[styles.statLabel, { color: c.muted }]}>Elapsed Time</Text>
            </View>
          </View>

          {/* Action Simulation Controls */}
          <View style={styles.simControls}>
            <Pressable
              style={[styles.secondaryBtn, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => setStep('mark_waypoint')}
            >
              <Text style={[styles.secondaryBtnText, { color: c.fg }]}>Mark Manual Waypoint (A1)</Text>
            </Pressable>

            <Pressable
              style={[styles.secondaryBtn, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={handleAddLivePoint}
            >
              <Text style={[styles.secondaryBtnText, { color: c.fg }]}>+ Record Next GPS Point</Text>
            </Pressable>

            <View style={styles.offlineToggleRow}>
              <Pressable
                style={[styles.smallChip, { backgroundColor: c.elevated, borderColor: c.border }]}
                onPress={handleTriggerOffline}
              >
                <Text style={[styles.smallChipText, { color: c.warn }]}>Simulate Offline (A2)</Text>
              </Pressable>
              <Pressable
                style={[styles.smallChip, { backgroundColor: c.elevated, borderColor: c.border }]}
                onPress={handleTriggerOnlineSync}
              >
                <Text style={[styles.smallChipText, { color: c.primary }]}>Simulate Sync (A3)</Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => setShowConfirmModal(true)}
          >
            <Text style={styles.primaryBtnText}>Complete Patrol</Text>
          </Pressable>
        </View>
      )}

      {/* 4. MARK MANUAL WAYPOINT (A1 OPTIONAL) */}
      {step === 'mark_waypoint' && (
        <View>
          <Text style={[styles.subHeading, { color: c.muted }]}>Optional Flow · Manual Waypoint</Text>
          <Text style={[styles.h1, { color: c.fg }]}>Mark Waypoint</Text>

          <OfflineMap mode="patrol" livePoints={livePoints} />

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.cardTitle, { color: c.fg }]}>Current Position</Text>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Latitude</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>8.4123° N</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Longitude</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>80.4021° E</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Capture Mode</Text>
              <View style={[styles.badge, { backgroundColor: 'rgba(31, 90, 67, 0.12)' }]}>
                <Text style={[styles.badgeText, { color: c.primary }]}>MANUAL (Captured from device)</Text>
              </View>
            </View>
          </View>

          {waypointToast && (
            <View style={[styles.toastCard, { backgroundColor: 'rgba(46, 125, 80, 0.15)', borderColor: c.success }]}>
              <Text style={[styles.toastText, { color: c.success }]}>
                ✓ Waypoint Saved · Saved to current patrol · Manual waypoint
              </Text>
            </View>
          )}

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={handleSaveManualWaypoint}
          >
            <Text style={styles.primaryBtnText}>Save Waypoint</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => setStep('in_progress')}
          >
            <Text style={[styles.secondaryBtnText, { color: c.fg }]}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {/* 5. OFFLINE PATROL - A2 */}
      {step === 'offline_view' && (
        <View>
          <View style={[styles.bannerAlert, { backgroundColor: c.warn }]}>
            <Text style={styles.bannerAlertText}>⚠️ OFFLINE · Data Stored Locally</Text>
          </View>

          <View style={styles.statusBanner}>
            <View style={[styles.badge, { backgroundColor: 'rgba(31, 90, 67, 0.12)' }]}>
              <Text style={[styles.badgeText, { color: c.primary }]}>● IN PROGRESS</Text>
            </View>
            <Text style={[styles.statusMeta, { color: c.muted }]}>Started 06:40 · Route NB-03</Text>
          </View>

          <OfflineMap mode="patrol" livePoints={livePoints} />

          <View style={[styles.statsRow, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: c.fg }]}>61</Text>
              <Text style={[styles.statLabel, { color: c.muted }]}>Positions Recorded</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: c.warn }]}>{pendingCount}</Text>
              <Text style={[styles.statLabel, { color: c.warn }]}>Pending Sync</Text>
            </View>
          </View>

          <View style={[styles.hintCard, { backgroundColor: c.elevated, borderColor: c.border }]}>
            <Text style={[styles.hintText, { color: c.muted }]}>
              Patrol data will synchronize automatically when connectivity returns. No data lost.
            </Text>
          </View>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => setStep('in_progress')}
          >
            <Text style={styles.primaryBtnText}>Continue Patrol (Online)</Text>
          </Pressable>
        </View>
      )}

      {/* 6. SYNCHRONIZING PENDING DATA - A3 */}
      {step === 'syncing_view' && (
        <View>
          <View style={[styles.bannerAlert, { backgroundColor: c.success }]}>
            <Text style={styles.bannerAlertText}>📶 ONLINE · Connection Restored</Text>
          </View>

          <View style={styles.statusBanner}>
            <View style={[styles.badge, { backgroundColor: 'rgba(31, 90, 67, 0.12)' }]}>
              <Text style={[styles.badgeText, { color: c.primary }]}>● IN PROGRESS</Text>
            </View>
            <Text style={[styles.statusMeta, { color: c.muted }]}>Started 06:40 · Route NB-03</Text>
          </View>

          <OfflineMap mode="patrol" livePoints={livePoints} />

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.cardTitle, { color: c.fg }]}>Synchronizing Pending Data...</Text>
            <Text style={[styles.syncCountdownText, { color: c.primary }]}>
              Pending Sync: {syncCountdown} → {Math.max(0, syncCountdown - 2)} → 0
            </Text>
            {syncCountdown === 0 && (
              <View style={[styles.badge, { backgroundColor: 'rgba(46, 125, 80, 0.15)', alignSelf: 'flex-start', marginTop: 8 }]}>
                <Text style={[styles.badgeText, { color: c.success }]}>
                  ✓ All patrol data synchronized · No re-entry needed
                </Text>
              </View>
            )}
          </View>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => setStep('in_progress')}
          >
            <Text style={styles.primaryBtnText}>Back to Patrol Tracking</Text>
          </Pressable>
        </View>
      )}

      {/* 8. PATROL COMPLETION SUMMARY */}
      {step === 'completed' && (
        <View style={styles.completedContainer}>
          <View style={[styles.circleCheck, { backgroundColor: c.success }]}>
            <Text style={styles.circleCheckIcon}>✓</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: 'rgba(46, 125, 80, 0.15)', alignSelf: 'center', marginTop: 10 }]}>
            <Text style={[styles.badgeText, { color: c.success }]}>● COMPLETED</Text>
          </View>

          <Text style={[styles.h1, { color: c.fg, textAlign: 'center', marginTop: 8 }]}>
            North Boundary Patrol
          </Text>
          <Text style={[styles.subHeading, { color: c.muted, textAlign: 'center', marginBottom: 14 }]}>
            Route NB-03
          </Text>

          {/* Big Circular Coverage Badge (Figure 6 - 96%) */}
          <View style={[styles.gaugeBox, { backgroundColor: c.surface, borderColor: c.primary }]}>
            <View style={[styles.gaugeCircle, { borderColor: c.primary }]}>
              <Text style={[styles.gaugePercent, { color: c.primary }]}>96%</Text>
              <Text style={[styles.gaugeSub, { color: c.muted }]}>Coverage</Text>
            </View>
            <View style={styles.gaugeTextGroup}>
              <Text style={[styles.gaugeTitle, { color: c.fg }]}>Patrol Coverage</Text>
              <Text style={[styles.gaugeDesc, { color: c.muted }]}>
                96% of NB-03 covered{'\n'}
                Calculated from 142 recorded PatrolPositions
              </Text>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Completion Time</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>09:45</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Duration</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>3 h 05 m</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Positions Recorded</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>142</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Route</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>NB-03</Text>
            </View>
          </View>

          <OfflineMap mode="patrol" livePoints={livePoints} />

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.primaryBtnText}>Done</Text>
          </Pressable>
        </View>
      )}

      {/* 7. COMPLETE PATROL CONFIRMATION MODAL */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.fg }]}>Complete this patrol?</Text>
            <Text style={[styles.modalMeta, { color: c.muted }]}>
              Route NB-03 · 142 positions · 3 h 05 m
            </Text>
            <Text style={[styles.modalNote, { color: c.fg }]}>
              Patrol Coverage will be calculated automatically.
            </Text>

            <View style={styles.modalBtnRow}>
              <Pressable
                style={[styles.modalCancelBtn, { borderColor: c.border }]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: c.muted }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirmBtn, { backgroundColor: c.primary }]}
                onPress={handleCompletePatrol}
              >
                <Text style={styles.modalConfirmText}>Complete Patrol</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { padding: 18, paddingTop: 20, paddingBottom: 40 },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  subHeading: { fontSize: 13, fontWeight: '700' },
  h1: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  cardBody: { fontSize: 13, lineHeight: 18 },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 8 },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  gridKey: { fontSize: 13, fontWeight: '600' },
  gridVal: { fontSize: 13, fontWeight: '700' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  primaryBtn: {
    height: 52,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700' },
  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  statusMeta: { fontSize: 12, fontWeight: '600' },
  subBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 10 },
  subBadgeText: { fontSize: 11, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 14,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, backgroundColor: '#E5E7EB' },
  statNum: { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '600' },
  simControls: { marginBottom: 14 },
  offlineToggleRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  smallChip: { flex: 1, paddingVertical: 8, borderWidth: 1, borderRadius: 8, alignItems: 'center' },
  smallChipText: { fontSize: 11, fontWeight: '700' },
  toastCard: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  toastText: { fontSize: 12, fontWeight: '700' },
  bannerAlert: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, marginBottom: 12 },
  bannerAlertText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  hintCard: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 14 },
  hintText: { fontSize: 12, lineHeight: 17 },
  syncCountdownText: { fontSize: 14, fontWeight: '800', marginVertical: 6 },
  completedContainer: { alignItems: 'stretch' },
  circleCheck: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleCheckIcon: { color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
  gaugeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    gap: 16,
  },
  gaugeCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gaugePercent: { fontSize: 20, fontWeight: '900' },
  gaugeSub: { fontSize: 9, fontWeight: '700' },
  gaugeTextGroup: { flex: 1 },
  gaugeTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  gaugeDesc: { fontSize: 12, lineHeight: 16 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { borderWidth: 1, borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  modalMeta: { fontSize: 13, fontWeight: '600', marginBottom: 12 },
  modalNote: { fontSize: 13, marginBottom: 20 },
  modalBtnRow: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, height: 48, borderWidth: 1, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600' },
  modalConfirmBtn: { flex: 1, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  modalConfirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
