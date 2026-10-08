import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import OfflineMap from '../components/OfflineMap';
import * as PatrolService from '../services/patrolService';
import { synchronize } from '../services/syncService';
import { countPendingSync } from '../store/localStore';
import type { GeoPoint } from '../types/models';
import { getSession } from '../session';
import { getColors, subscribeTheme } from '../theme';

async function readDeviceGeo(): Promise<{ geo: GeoPoint; source: 'GPS' | 'MANUAL' }> {
  try {
    // Optional native module — present after `npx expo install expo-location`.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Location = require('expo-location') as {
      requestForegroundPermissionsAsync: () => Promise<{ status: string }>;
      getCurrentPositionAsync: (opts: { accuracy: number }) => Promise<{
        coords: { latitude: number; longitude: number };
      }>;
      Accuracy: { Balanced: number };
    };
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      geo: { lat: pos.coords.latitude, lng: pos.coords.longitude },
      source: 'GPS',
    };
  } catch {
    // Confirmed MANUAL fallback (no random fake track).
    return new Promise((resolve, reject) => {
      Alert.alert(
        'Location',
        'GPS unavailable. Drop a MANUAL waypoint at the last known field pin (6.4100, 81.1200)?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => reject(new Error('Cancelled')) },
          {
            text: 'Use MANUAL pin',
            onPress: () =>
              resolve({ geo: { lat: 6.41, lng: 81.12 }, source: 'MANUAL' as const }),
          },
        ]
      );
    });
  }
}

export default function PatrolScreen({
  navigation,
}: {
  navigation: { replace: (r: string) => void };
}) {
  const session = getSession();
  const [, bump] = useState(0);
  const [status, setStatus] = useState('Idle');
  const [points, setPoints] = useState(0);
  const [patrolId, setPatrolId] = useState<string | undefined>();
  const [liveTrack, setLiveTrack] = useState<GeoPoint[]>([]);
  const [pending, setPending] = useState(countPendingSync());

  useEffect(() => subscribeTheme(() => bump((n) => n + 1)), []);
  const c = getColors();

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

  const start = () => {
    const p = PatrolService.startPatrol('RT-07', officerId);
    setPatrolId(p.patrolId);
    setLiveTrack([]);
    setStatus(`ACTIVE · ${p.patrolId.slice(0, 8)}`);
    setPoints(0);
    setPending(countPendingSync());
  };

  const waypoint = async () => {
    try {
      const { geo, source } = await readDeviceGeo();
      PatrolService.recordPoint(geo, source);
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
    <View style={[styles.wrap, { backgroundColor: c.bg }]}>
      <Text style={[styles.h, { color: c.fg }]}>Route RT-07 · North Ridge</Text>
      <Text style={[styles.meta, { color: c.warn }]}>
        {status} · points {points} · officer {officerId}
      </Text>
      <Text style={[styles.offlineHint, { color: c.muted }]}>
        Device GPS when permitted · MANUAL pin only if GPS unavailable · {pending} pending
      </Text>
      <OfflineMap patrolId={patrolId} livePoints={liveTrack.length > 0 ? liveTrack : undefined} />
      <Pressable style={[styles.btn, { backgroundColor: c.accent }]} onPress={start}>
        <Text style={[styles.btnT, { color: c.accentFg }]}>Start Patrol</Text>
      </Pressable>
      <Pressable
        style={[styles.btnSecondary, { backgroundColor: c.elevated, borderColor: c.border }]}
        onPress={() => void waypoint()}
      >
        <Text style={[styles.btnT, { color: c.fg }]}>+ Waypoint</Text>
      </Pressable>
      <Pressable
        style={[styles.btnSecondary, { backgroundColor: c.elevated, borderColor: c.border }]}
        onPress={finish}
      >
        <Text style={[styles.btnT, { color: c.fg }]}>Finish</Text>
      </Pressable>
      <Pressable style={[styles.btn, { backgroundColor: c.accent }]} onPress={sync}>
        <Text style={[styles.btnT, { color: c.accentFg }]}>Sync now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20 },
  h: { fontSize: 18, fontWeight: '700' },
  meta: { marginVertical: 8 },
  offlineHint: { fontSize: 12, marginBottom: 12, lineHeight: 18 },
  btn: { padding: 16, borderRadius: 12, marginBottom: 10 },
  btnSecondary: { borderWidth: 1, padding: 16, borderRadius: 12, marginBottom: 10 },
  btnT: { textAlign: 'center', fontWeight: '700' },
});
