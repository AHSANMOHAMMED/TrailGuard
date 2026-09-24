import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { createIncident } from '../services/incidentService';
import { synchronize } from '../services/syncService';

export default function IncidentScreen() {
  const [last, setLast] = useState('—');

  const save = () => {
    const ir = createIncident({
      parkId: 'park-yala',
      type: 'Snare',
      description: 'Wire snare near dry creek',
      geo: { lat: 6.41, lng: 81.12 },
      locationSource: 'MANUAL',
      photoUri: 'file://local/demo.jpg',
    });
    setLast(`${ir.reportId.slice(0, 8)} · PENDING`);
  };

  const sync = async () => {
    const r = await synchronize();
    Alert.alert('Sync', `Incidents: ${r.incidents}\n${r.errors.join('; ') || 'ok'}`);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.h}>New incident (offline OK)</Text>
      <Text style={styles.meta}>Last: {last}</Text>
      <Pressable style={styles.btn} onPress={save}><Text style={styles.btnT}>Save report</Text></Pressable>
      <Pressable style={styles.btn} onPress={sync}><Text style={styles.btnT}>Sync (complete-receipt)</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: '#0A100C' },
  h: { color: '#fff', fontSize: 18, fontWeight: '700' },
  meta: { color: '#8A9E8E', marginVertical: 12 },
  btn: { backgroundColor: '#2EA05F', padding: 16, borderRadius: 12, marginBottom: 10 },
  btnT: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
