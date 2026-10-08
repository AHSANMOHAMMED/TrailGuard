import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import OfflineMap from '../components/OfflineMap';
import { synchronize } from '../services/syncService';
import {
  fetchSharedHealth,
  getApiBaseOrEmpty,
  getBuildDefaultApiBase,
  isApiConfigured,
  setApiBase,
} from '../services/api';
import { countPendingSync, initLocalStore } from '../store/localStore';
import { getSession, setSession, subscribeSession } from '../session';
import { AREA_ROUTES } from '../roles';
import { getColors, getTheme, subscribeTheme, toggleTheme } from '../theme';

export default function HomeScreen({
  navigation,
}: {
  navigation: { navigate: (r: string) => void; replace: (r: string) => void };
}) {
  const [pending, setPending] = useState(0);
  const [apiDraft, setApiDraft] = useState(getApiBaseOrEmpty());
  const [healthLine, setHealthLine] = useState<string>('Checking backend…');
  const [healthOk, setHealthOk] = useState(false);
  const [, bump] = useState(0);

  const refreshHealth = useCallback(async () => {
    if (!isApiConfigured()) {
      setHealthOk(false);
      setHealthLine('Backend not configured — set API URL below');
      return;
    }
    try {
      const h = await fetchSharedHealth();
      setHealthOk(true);
      const c = h.counts ?? {};
      setHealthLine(
        `Live · ${h.source} · P${c.patrols ?? 0} I${c.incidents ?? 0} C${c.conflicts ?? 0}`
      );
    } catch (e: unknown) {
      setHealthOk(false);
      setHealthLine(
        `Unreachable — ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }, []);

  useEffect(() => {
    initLocalStore();
    setPending(countPendingSync());
    setApiDraft(getApiBaseOrEmpty());
    void refreshHealth();
    const a = subscribeTheme(() => bump((n) => n + 1));
    const b = subscribeSession(() => bump((n) => n + 1));
    return () => {
      a();
      b();
    };
  }, [refreshHealth]);

  const session = getSession();
  const c = getColors();
  const night = getTheme() === 'night';

  useEffect(() => {
    if (!session) navigation.replace('Login');
  }, [session, navigation]);

  if (!session) return null;

  const items = AREA_ROUTES.filter((item) => session.access.includes(item.area));

  const sync = async () => {
    if (!isApiConfigured()) {
      Alert.alert('Sync', 'Set the live API URL first (https://host/api/v1).');
      return;
    }
    const r = await synchronize();
    setPending(countPendingSync());
    await refreshHealth();
    Alert.alert(
      'Sync',
      `Uploaded — patrols: ${r.patrols}, incidents: ${r.incidents}, conflicts: ${r.conflicts}\n` +
        (r.errors.length ? r.errors.join('\n') : 'All clear.')
    );
  };

  const saveApi = () => {
    setApiBase(apiDraft);
    void refreshHealth();
    Alert.alert('API', apiDraft.trim() ? 'Saved live API base.' : 'Cleared — using build default if any.');
  };

  return (
    <ScrollView style={[styles.wrap, { backgroundColor: c.bg }]} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.brand, { color: c.fg }]}>TrailGuard</Text>
          <Text style={[styles.sub, { color: c.muted }]}>
            {session.title} · offline-first field ops
          </Text>
        </View>
        <Pressable
          onPress={() => toggleTheme()}
          style={[styles.themeBtn, { borderColor: c.border, backgroundColor: c.surface }]}
        >
          <Text style={{ color: c.fg, fontWeight: '700', fontSize: 12 }}>
            {night ? 'Day' : 'Night'}
          </Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.banner,
          {
            backgroundColor: healthOk ? c.elevated : c.surface,
            borderColor: healthOk ? c.accent : c.warn,
          },
        ]}
      >
        <Text style={{ color: healthOk ? c.fg : c.warn, fontSize: 12, fontWeight: '600' }}>
          {healthLine}
        </Text>
        <Text style={{ color: c.muted, fontSize: 11, marginTop: 4 }}>
          {getApiBaseOrEmpty() || '(no URL)'}
          {getBuildDefaultApiBase() ? ` · build default set` : ''}
        </Text>
      </View>

      <Text style={[styles.label, { color: c.muted }]}>Live API base (/api/v1)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.border, color: c.fg }]}
        value={apiDraft}
        onChangeText={setApiDraft}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="https://host/api/v1 or http://LAN_IP:8080/api/v1"
        placeholderTextColor={c.muted}
      />
      <Pressable style={[styles.syncBtn, { backgroundColor: c.elevated, borderColor: c.border, borderWidth: 1 }]} onPress={saveApi}>
        <Text style={[styles.syncBtnT, { color: c.fg }]}>Save API URL</Text>
      </Pressable>

      <Text style={[styles.pending, { color: c.warn }]}>
        {pending} record{pending === 1 ? '' : 's'} waiting to sync
      </Text>
      <OfflineMap />
      <Pressable style={[styles.syncBtn, { backgroundColor: c.accent }]} onPress={sync}>
        <Text style={[styles.syncBtnT, { color: c.accentFg }]}>Sync pending to server</Text>
      </Pressable>
      {items.map((item) => (
        <Pressable
          key={item.route}
          style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={() => navigation.navigate(item.route)}
        >
          <Text style={[styles.cardText, { color: c.fg }]}>{item.title}</Text>
        </Pressable>
      ))}
      <Pressable
        style={[styles.signOut, { borderColor: c.border }]}
        onPress={() => {
          setSession(null);
          navigation.replace('Login');
        }}
      >
        <Text style={{ color: c.muted, fontWeight: '600', textAlign: 'center' }}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12, gap: 8 },
  brand: { fontSize: 28, fontWeight: '700' },
  sub: { marginBottom: 8 },
  themeBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    marginBottom: 8,
  },
  pending: { fontSize: 13, marginBottom: 12, marginTop: 8 },
  syncBtn: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  syncBtnT: { textAlign: 'center', fontWeight: '700' },
  card: {
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardText: { fontSize: 16, fontWeight: '600' },
  signOut: {
    marginTop: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
});
