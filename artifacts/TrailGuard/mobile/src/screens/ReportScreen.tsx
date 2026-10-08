import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { generateReport } from '../services/api';
import { getSession } from '../session';
import { getColors, subscribeTheme } from '../theme';

export default function ReportScreen({
  navigation,
}: {
  navigation: { replace: (r: string) => void };
}) {
  const session = getSession();
  const [, bump] = useState(0);
  const [result, setResult] = useState<any>(null);

  useEffect(() => subscribeTheme(() => bump((n) => n + 1)), []);
  const c = getColors();

  useEffect(() => {
    if (!session) {
      navigation.replace('Login');
      return;
    }
    if (!session.access.includes('reports')) {
      navigation.replace('Home');
    }
  }, [session, navigation]);

  if (!session || !session.access.includes('reports')) return null;

  const run = async () => {
    try {
      const r = await generateReport('park-yala', '2026-08-01T00:00:00', '2026-08-31T23:59:59');
      setResult(r);
    } catch (e: any) {
      Alert.alert('Report', e.message);
    }
  };

  return (
    <View style={[styles.wrap, { backgroundColor: c.bg }]}>
      <Text style={[styles.h, { color: c.fg }]}>Conservation report</Text>
      <Pressable style={[styles.btn, { backgroundColor: c.accent }]} onPress={run}>
        <Text style={[styles.btnT, { color: c.accentFg }]}>Generate snapshot</Text>
      </Pressable>
      {result && (
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.line, { color: c.fg }]}>ID: {result.report_id?.slice?.(0, 8)}</Text>
          <Text style={[styles.line, { color: c.fg }]}>Incidents: {result.incident_count}</Text>
          <Text style={[styles.line, { color: c.fg }]}>Cutoff: {result.cutoff}</Text>
          <Text style={[styles.line, { color: c.muted }]}>{result.note}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20 },
  h: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  btn: { padding: 16, borderRadius: 12 },
  btnT: { textAlign: 'center', fontWeight: '700' },
  card: { marginTop: 16, borderWidth: 1, padding: 14, borderRadius: 12 },
  line: { marginBottom: 6 },
});
