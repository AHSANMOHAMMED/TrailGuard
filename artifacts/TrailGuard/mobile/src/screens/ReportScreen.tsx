import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { generateReport } from '../services/api';

export default function ReportScreen() {
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    try {
      const r = await generateReport('park-yala', '2026-08-01T00:00:00', '2026-08-31T23:59:59');
      setResult(r);
    } catch (e: any) {
      Alert.alert('Report', e.message);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.h}>Conservation report</Text>
      <Pressable style={styles.btn} onPress={run}><Text style={styles.btnT}>Generate snapshot</Text></Pressable>
      {result && (
        <View style={styles.card}>
          <Text style={styles.line}>ID: {result.report_id?.slice?.(0, 8)}</Text>
          <Text style={styles.line}>Incidents: {result.incident_count}</Text>
          <Text style={styles.line}>Cutoff: {result.cutoff}</Text>
          <Text style={styles.line}>{result.note}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: '#0A100C' },
  h: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  btn: { backgroundColor: '#2EA05F', padding: 16, borderRadius: 12 },
  btnT: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  card: { marginTop: 16, backgroundColor: '#141E18', padding: 14, borderRadius: 12 },
  line: { color: '#E6F0E6', marginBottom: 6 },
});
