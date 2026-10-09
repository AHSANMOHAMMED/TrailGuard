import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { generateReport } from '../services/api';
import { getSession } from '../session';
import { getColors, subscribeTheme } from '../theme';
import { getLocalStats } from '../store/localStore';

type ReportTotals = {
  patrols?: number;
  incidents?: number;
  conflicts?: number;
  radio?: number;
  alerts?: number;
};

type ReportSnapshot = {
  park_id?: string;
  date_from?: string | null;
  date_to?: string | null;
  generated_at?: string;
  source?: string;
  totals?: ReportTotals;
  error?: string;
};

export default function ReportScreen({
  navigation,
}: {
  navigation: { replace: (r: string) => void };
}) {
  const session = getSession();
  const [, bump] = useState(0);
  const [result, setResult] = useState<ReportSnapshot | null>(null);
  const [busy, setBusy] = useState(false);

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

  const isResearcher = session.role === 'RESEARCHER';

  const run = async () => {
    setBusy(true);
    try {
      const r = (await generateReport(
        'park-yala',
        '2026-08-01T00:00:00',
        '2026-08-31T23:59:59',
      )) as ReportSnapshot;
      setResult(r);
    } catch {
      const stats = getLocalStats();
      setResult({
        park_id: 'park-yala',
        date_from: '2026-08-01',
        date_to: '2026-08-31',
        generated_at: new Date().toISOString(),
        source: 'Local device store (offline snapshot)',
        totals: {
          patrols: stats.patrols,
          incidents: stats.incidents,
          conflicts: stats.conflicts,
          radio: 0,
          alerts: 0,
        },
      });
    } finally {
      setBusy(false);
    }
  };

  const totals = result?.totals;

  return (
    <ScrollView style={[styles.wrap, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.h, { color: c.fg }]}>
        {isResearcher ? 'Research snapshot' : 'Park ops snapshot'}
      </Text>
      <Text style={[styles.meta, { color: c.muted }]}>
        {isResearcher
          ? 'Synced field counts for hotspot / coverage analysis. Export after generate.'
          : 'Manager desk — SYNCED patrols, incidents, conflicts and coverage for the selected window.'}
      </Text>

      <View style={[styles.roleCard, { backgroundColor: c.elevated, borderColor: c.border }]}>
        <Text style={{ color: c.primary, fontWeight: '800', fontSize: 11 }}>
          {session.role} · {session.title}
        </Text>
        <Text style={{ color: c.muted, fontSize: 12, marginTop: 4 }}>
          Window default: Aug 2026 · Yala
        </Text>
      </View>

      <Pressable
        style={[styles.btn, { backgroundColor: c.accent, opacity: busy ? 0.7 : 1 }]}
        onPress={run}
        disabled={busy}
      >
        <Text style={[styles.btnT, { color: c.accentFg }]}>
          {busy ? 'Generating…' : 'Generate snapshot'}
        </Text>
      </Pressable>

      {result && (
        <View style={[styles.card, { backgroundColor: c.card ?? c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.fg }]}>Snapshot totals</Text>
          <View style={styles.statGrid}>
            <Stat label="Patrols" value={totals?.patrols ?? 0} c={c} />
            <Stat label="Incidents" value={totals?.incidents ?? 0} c={c} />
            <Stat label="Conflicts" value={totals?.conflicts ?? 0} c={c} />
            <Stat label="Alerts" value={totals?.alerts ?? 0} c={c} />
          </View>
          <Text style={[styles.line, { color: c.muted }]}>Park: {result.park_id ?? '—'}</Text>
          <Text style={[styles.line, { color: c.muted }]}>Source: {result.source ?? '—'}</Text>
          <Text style={[styles.line, { color: c.muted }]}>
            Generated:{' '}
            {result.generated_at ? new Date(result.generated_at).toLocaleString() : '—'}
          </Text>
          {(result.date_from || result.date_to) && (
            <Text style={[styles.line, { color: c.muted }]}>
              Window: {result.date_from ?? '…'} → {result.date_to ?? '…'}
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  c,
}: {
  label: string;
  value: number;
  c: ReturnType<typeof getColors>;
}) {
  return (
    <View style={[styles.stat, { backgroundColor: c.elevated }]}>
      <Text style={{ color: c.muted, fontSize: 11, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: c.fg, fontSize: 20, fontWeight: '800' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  h: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  meta: { fontSize: 13, lineHeight: 20, marginBottom: 14 },
  roleCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  btn: { padding: 16, borderRadius: 12 },
  btnT: { textAlign: 'center', fontWeight: '700' },
  card: { marginTop: 16, borderWidth: 1, padding: 14, borderRadius: 12 },
  cardTitle: { fontSize: 14, fontWeight: '800', marginBottom: 10 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  stat: { width: '47%', borderRadius: 10, padding: 10 },
  line: { marginBottom: 6, fontSize: 12 },
});
