import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import * as PatrolService from '../services/patrolService';
import { synchronize } from '../services/syncService';

export default function PatrolScreen() {
  const [status, setStatus] = useState('Idle');
  const [points, setPoints] = useState(0);

  const start = () => {
    const p = PatrolService.startPatrol('RT-07', 'officer-demo');
    setStatus(`ACTIVE · ${p.patrolId.slice(0, 8)}`);
    setPoints(0);
  };

  const waypoint = () => {
    try {
      PatrolService.recordPoint({ lat: 6.4 + Math.random() * 0.01, lng: 81.1 }, 'GPS');
      setPoints((n) => n + 1);
    } catch (e: any) {
      Alert.alert('Patrol', e.message);
    }
  };

  const finish = () => {
    try {
      const p = PatrolService.completePatrol();
      setStatus(`COMPLETED · PENDING · ${p.waypoints.length} pts`);
    } catch (e: any) {
      Alert.alert('Patrol', e.message);
    }
  };

  const sync = async () => {
    const r = await synchronize();
    Alert.alert('Sync', `Patrols: ${r.patrols}\nErrors: ${r.errors.join('; ') || 'none'}`);
    if (r.patrols > 0) setStatus('SYNCED');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.h}>Route RT-07 · North Ridge</Text>
      <Text style={styles.meta}>{status} · points {points}</Text>
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
  meta: { color: '#D97706', marginVertical: 12 },
  btn: { backgroundColor: '#2EA05F', padding: 16, borderRadius: 12, marginBottom: 10 },
  btnSecondary: { backgroundColor: '#1C2A20', padding: 16, borderRadius: 12, marginBottom: 10 },
  btnT: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
