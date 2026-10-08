import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import OfflineMap from '../components/OfflineMap';
import { synchronize } from '../services/syncService';
import { countPendingSync, initLocalStore } from '../store/localStore';

export default function HomeScreen({ navigation }: { navigation: { navigate: (r: string) => void } }) {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    initLocalStore();
    setPending(countPendingSync());
  }, []);

  const sync = async () => {
    const r = await synchronize();
    setPending(countPendingSync());
    Alert.alert(
      'Sync',
      `Uploaded — patrols: ${r.patrols}, incidents: ${r.incidents}, conflicts: ${r.conflicts}\n` +
        (r.errors.length ? r.errors.join('\n') : 'All clear.')
    );
  };

  const Item = ({ title, route }: { title: string; route: string }) => (
    <Pressable style={styles.card} onPress={() => navigation.navigate(route)}>
      <Text style={styles.cardText}>{title}</Text>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.brand}>TrailGuard</Text>
      <Text style={styles.sub}>Offline-first field operations · no Neon required</Text>
      <Text style={styles.pending}>{pending} record{pending === 1 ? '' : 's'} waiting to sync</Text>
      <OfflineMap />
      <Pressable style={styles.syncBtn} onPress={sync}>
        <Text style={styles.syncBtnT}>Sync pending to server</Text>
      </Pressable>
      <Item title="UC01 · Patrol" route="Patrol" />
      <Item title="UC02 · Incident" route="Incident" />
      <Item title="UC03 · Conflict" route="Conflict" />
      <Item title="UC04 · Reports" route="Reports" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: '#0A100C' },
  brand: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 12 },
  sub: { color: '#8A9E8E', marginBottom: 8 },
  pending: { color: '#D97706', fontSize: 13, marginBottom: 12 },
  syncBtn: {
    backgroundColor: '#2EA05F',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  syncBtnT: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  card: {
    backgroundColor: '#141E18',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2E5038',
  },
  cardText: { color: '#E6F0E6', fontSize: 16, fontWeight: '600' },
});
