import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import OfflineMap from '../components/OfflineMap';
import * as PatrolService from '../services/patrolService';
import { synchronize } from '../services/syncService';
import { countPendingSync } from '../store/localStore';
import type { GeoPoint } from '../types/models';

export default function PatrolScreen() {
  const [status, setStatus] = useState('Idle');
  const [points, setPoints] = useState(0);
  const [patrolId, setPatrolId] = useState<string | undefined>();
  const [liveTrack, setLiveTrack] = useState<GeoPoint[]>([]);
  const [pending, setPending] = useState(countPendingSync());

  const start = () => {
    const p = PatrolService.startPatrol('RT-07', 'officer-demo');
    setPatrolId(p.patrolId);
    setLiveTrack([]);
    setStatus(`ACTIVE · ${p.patrolId.slice(0, 8)}`);
    setPoints(0);
    setPending(countPendingSync());
  };

  const waypoint = () => {
    try {
      const geo = { lat: 6.4 + Math.random() * 0.01, lng: 81.1 + Math.random() * 0.01 };
      PatrolService.recordPoint(geo, 'GPS');
      setLiveTrack((t) => [...t, geo]);
      setPoints((n) => n + 1);
    } catch (e: unknown) {
      Alert.alert('Patrol', e instanceof Error ? e.message : String(e));
    }
  };

  const finish = () => {
    try {
      const p = PatrolService.completePatrol();
      setStatus(`COMPLETED · PENDING · ${p.waypoints.length} pts`);
      setPending(countPendingSync());
    } catch (e: unknown) {
      Alert.alert('Patrol', e instanceof Error ? e.message : String(e));
    }
  };

  const sync = async () => {
    const r = await synchronize();
    setPending(countPendingSync());
    Alert.alert(
      'Sync',
      `Patrols: ${r.patrols} · Incidents: ${r.incidents} · Conflicts: ${r.conflicts}\n` +
        `Errors: ${r.errors.join('; ') || 'none'}`
    );
    if (r.patrols > 0) setStatus('SYNCED');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.h}>Route RT-07 · North Ridge</Text>
      <Text style={styles.meta}>{status} · points {points}</Text>
      <Text style={styles.offlineHint}>
        SQLite on device · {pending} pending upload{pending === 1 ? '' : 's'} · sync when online
      </Text>
      <OfflineMap patrolId={patrolId} livePoints={liveTrack.length > 0 ? liveTrack : undefined} />
      <Pressable style={styles.btn} onPress={start}><Text style={styles.btnT}>Start Patrol</Text></Pressable>
      <Pressable style={styles.btnSecondary} onPress={waypoint}><Text style={styles.btnT}>+ Waypoint</Text></Pressable>
      <Pressable style={styles.btnSecondary} onPress={finish}><Text style={styles.btnT}>Finish</Text></Pressable>
      <Pressable style={styles.btn} onPress={sync}><Text style={styles.btnT}>Sync now</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: '#0A100C' },
  h: { color: '#fff', fontSize: 18, fontWeight: '700' },
  meta: { color: '#D97706', marginVertical: 8 },
  offlineHint: { color: '#8A9E8E', fontSize: 12, marginBottom: 12, lineHeight: 18 },
  btn: { backgroundColor: '#2EA05F', padding: 16, borderRadius: 12, marginBottom: 10 },
  btnSecondary: { backgroundColor: '#1C2A20', padding: 16, borderRadius: 12, marginBottom: 10 },
  btnT: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
