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
import { getSession, setSession, subscribeSession, sessionFromLogin } from '../session';
import { AREA_ROUTES } from '../roles';
import { getColors, getTheme, subscribeTheme, toggleTheme } from '../theme';
import { ACCOUNTS } from './LoginScreen';

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
    if (apiDraft.trim() && apiDraft.trim().replace(/\/$/, '') !== getApiBaseOrEmpty()) {
      setApiBase(apiDraft);
    }
    if (!isApiConfigured()) {
      Alert.alert('Sync', 'Set the live API URL first (https://host/api/v1).');
      return;
    }
    const r = await synchronize();
    setPending(countPendingSync());
    await refreshHealth();
    Alert.alert(
      'Sync Complete',
      `Uploaded to Central Database:\n• Patrols: ${r.patrols}\n• Incidents: ${r.incidents}\n• Conflicts: ${r.conflicts}\n` +
        (r.errors.length ? `\nErrors:\n${r.errors.join('\n')}` : '\nAll records synchronized.')
    );
  };

  const saveApi = () => {
    setApiBase(apiDraft);
    void refreshHealth();
    Alert.alert('API URL', apiDraft.trim() ? 'Saved live API base.' : 'Cleared — using build default if any.');
  };

  const switchActor = (userId: string) => {
    const acc = ACCOUNTS.find((a) => a.userId.toLowerCase() === userId.toLowerCase());
    if (acc) {
      setSession(sessionFromLogin(acc.role, acc.title, acc.userId));
    }
  };

  return (
    <ScrollView style={[styles.wrap, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      {/* Top App Header */}
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.brand, { color: c.primary }]}>TrailGuard</Text>
          <Text style={[styles.sub, { color: c.muted }]}>
            Department of Wildlife Conservation · Sri Lanka
          </Text>
        </View>
        <Pressable
          onPress={toggleTheme}
          style={[styles.themeBtn, { borderColor: c.border, backgroundColor: c.surface }]}
          accessibilityLabel="Toggle Theme"
        >
          <Text style={{ color: c.fg, fontWeight: '700', fontSize: 11 }}>
            {night ? '☀️ Day' : '🌙 Night'}
          </Text>
        </Pressable>
      </View>

      {/* Active Actor Card */}
      <View style={[styles.actorCard, { backgroundColor: c.surface, borderColor: c.primary }]}>
        <View style={styles.actorHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actorTitle, { color: c.fg }]}>{session.title}</Text>
            <Text style={[styles.actorBadgeId, { color: c.primary }]}>
              Badge: {session.userId} · Role: {session.role}
            </Text>
          </View>
          <View style={[styles.roleChip, { backgroundColor: c.primary }]}>
            <Text style={styles.roleChipText}>{session.role}</Text>
          </View>
        </View>

        {/* Quick Switch Actor Pills */}
        <Text style={[styles.quickSwitchLabel, { color: c.muted }]}>Quick Switch Actor:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.switchScroll}>
          {ACCOUNTS.map((a) => {
            const isCurrent = a.userId.toLowerCase() === session.userId.toLowerCase();
            return (
              <Pressable
                key={a.userId}
                style={[
                  styles.switchChip,
                  {
                    backgroundColor: isCurrent ? c.primary : c.elevated,
                    borderColor: isCurrent ? c.primary : c.border,
                  },
                ]}
                onPress={() => switchActor(a.userId)}
              >
                <Text
                  style={[
                    styles.switchChipText,
                    { color: isCurrent ? c.accentFg : c.fg },
                  ]}
                >
                  {a.role}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Backend & Offline Status Banner */}
      <View
        style={[
          styles.banner,
          {
            backgroundColor: healthOk ? c.elevated : c.surface,
            borderColor: healthOk ? c.primary : c.warn,
          },
        ]}
      >
        <View style={styles.bannerHeader}>
          <Text style={{ color: healthOk ? c.primary : c.warn, fontSize: 12, fontWeight: '800' }}>
            {healthOk ? '● LIVE CENTRAL DATABASE' : '⚠️ BACKEND OFFLINE / STANDALONE'}
          </Text>
        </View>
        <Text style={{ color: c.fg, fontSize: 12, fontWeight: '600', marginTop: 2 }}>
          {healthLine}
        </Text>
        <Text style={{ color: c.muted, fontSize: 11, marginTop: 4 }}>
          {getApiBaseOrEmpty() || '(using default API host)'}
          {getBuildDefaultApiBase() ? ' · build default set' : ''}
        </Text>
      </View>

      {/* Sync Queue Card */}
      <View style={[styles.syncCard, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.syncHeader}>
          <Text style={[styles.syncTitle, { color: c.fg }]}>Local SQLite Data Queue</Text>
          <View
            style={[
              styles.pendingBadge,
              { backgroundColor: pending > 0 ? 'rgba(217, 119, 6, 0.15)' : 'rgba(46, 125, 80, 0.15)' },
            ]}
          >
            <Text
              style={[
                styles.pendingBadgeText,
                { color: pending > 0 ? c.warn : c.success },
              ]}
            >
              {pending} record{pending === 1 ? '' : 's'} pending
            </Text>
          </View>
        </View>

        <Pressable
          style={[styles.syncBtn, { backgroundColor: c.primary }]}
          onPress={sync}
        >
          <Text style={[styles.syncBtnT, { color: c.accentFg }]}>
            {pending > 0 ? `Sync ${pending} Pending Records to Server` : 'Sync & Check Backend'}
          </Text>
        </Pressable>
      </View>

      {/* Park Overview Map */}
      <Text style={[styles.sectionHeading, { color: c.fg }]}>Yala North Sector Map</Text>
      <OfflineMap mode="overview" />

      {/* Assigned Operations & Use Case Routes */}
      <Text style={[styles.sectionHeading, { color: c.fg }]}>Assigned Operations</Text>
      {items.map((item) => (
        <Pressable
          key={item.route}
          style={[styles.useCaseCard, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => navigation.navigate(item.route)}
        >
          <View style={styles.useCaseTop}>
            <Text style={[styles.useCaseTitle, { color: c.fg }]}>{item.title}</Text>
            <View style={[styles.useCaseBadge, { backgroundColor: c.elevated }]}>
              <Text style={[styles.useCaseBadgeText, { color: c.primary }]}>{item.badge}</Text>
            </View>
          </View>
          <Text style={[styles.useCaseSub, { color: c.muted }]}>{item.subtitle}</Text>
        </Pressable>
      ))}

      {/* Live API Config Expandable */}
      <Text style={[styles.label, { color: c.muted, marginTop: 12 }]}>Custom API Base URL (/api/v1)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.border, color: c.fg }]}
        value={apiDraft}
        onChangeText={setApiDraft}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="https://host/api/v1"
        placeholderTextColor={c.muted}
      />
      <Pressable
        style={[styles.smallBtn, { backgroundColor: c.elevated, borderColor: c.border }]}
        onPress={saveApi}
      >
        <Text style={[styles.smallBtnText, { color: c.fg }]}>Save API URL</Text>
      </Pressable>

      {/* Sign Out */}
      <Pressable
        style={[styles.signOut, { borderColor: c.border, backgroundColor: c.surface }]}
        onPress={() => {
          setSession(null);
          navigation.replace('Login');
        }}
      >
        <Text style={{ color: c.muted, fontWeight: '700', textAlign: 'center' }}>
          Sign Out of TrailGuard
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { padding: 18, paddingTop: 48, paddingBottom: 40 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  brand: { fontSize: 24, fontWeight: '800', letterSpacing: 0.5 },
  sub: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  themeBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actorCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  actorHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  actorTitle: { fontSize: 16, fontWeight: '800' },
  actorBadgeId: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  roleChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  roleChipText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  quickSwitchLabel: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
  switchScroll: { flexDirection: 'row' },
  switchChip: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  switchChipText: { fontSize: 11, fontWeight: '700' },
  banner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  bannerHeader: { flexDirection: 'row', alignItems: 'center' },
  syncCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  syncHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  syncTitle: { fontSize: 13, fontWeight: '700' },
  pendingBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  pendingBadgeText: { fontSize: 11, fontWeight: '800' },
  syncBtn: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncBtnT: { fontSize: 14, fontWeight: '700' },
  sectionHeading: { fontSize: 15, fontWeight: '800', marginTop: 8, marginBottom: 10 },
  useCaseCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  useCaseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  useCaseTitle: { fontSize: 15, fontWeight: '700' },
  useCaseBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  useCaseBadgeText: { fontSize: 10, fontWeight: '800' },
  useCaseSub: { fontSize: 12, lineHeight: 16 },
  label: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    marginBottom: 8,
  },
  smallBtn: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  smallBtnText: { fontSize: 13, fontWeight: '700' },
  signOut: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
});
