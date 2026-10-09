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
import {
  actorMission,
  canSeeEngineerChrome,
  canSeePullDb,
  canSyncField,
  homeAreasFor,
} from '../actor-capabilities';
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
  const [showDevSwitch, setShowDevSwitch] = useState(false);
  const [, bump] = useState(0);

  const refreshHealth = useCallback(async () => {
    if (!isApiConfigured()) {
      setHealthOk(false);
      setHealthLine('Backend not configured');
      return;
    }
    try {
      const h = await fetchSharedHealth();
      setHealthOk(true);
      const c = h.counts ?? {};
      setHealthLine(
        `Connected · ${h.source} · P${c.patrols ?? 0} I${c.incidents ?? 0} C${c.conflicts ?? 0}`
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

  const showEngineer = canSeeEngineerChrome(session.role);
  const showPull = canSeePullDb(session.role);
  const showSync = canSyncField(session.role);
  const myAreas = homeAreasFor(session.role, session.access);
  const items = AREA_ROUTES.filter((item) => myAreas.includes(item.area));

  const sync = async () => {
    if (showEngineer && apiDraft.trim() && apiDraft.trim().replace(/\/$/, '') !== getApiBaseOrEmpty()) {
      setApiBase(apiDraft);
    }
    if (!isApiConfigured()) {
      Alert.alert('Sync', 'Live API is not configured on this build.');
      return;
    }
    const r = await synchronize();
    setPending(countPendingSync());
    await refreshHealth();
    Alert.alert(
      'Sync complete',
      `Uploaded:\n• Patrols: ${r.patrols}\n• Incidents: ${r.incidents}\n• Conflicts: ${r.conflicts}\n` +
        (r.errors.length ? `\nErrors:\n${r.errors.join('\n')}` : '\nAll pending records synced.')
    );
  };

  const saveApi = () => {
    setApiBase(apiDraft);
    void refreshHealth();
    Alert.alert('API URL', apiDraft.trim() ? 'Saved.' : 'Cleared — using build default.');
  };

  const switchActor = (userId: string) => {
    const acc = ACCOUNTS.find((a) => a.userId.toLowerCase() === userId.toLowerCase());
    if (acc) {
      setSession(sessionFromLogin(acc.role, acc.title, acc.userId));
      setShowDevSwitch(false);
    }
  };

  return (
    <ScrollView style={[styles.wrap, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Pressable onLongPress={() => showEngineer && setShowDevSwitch((v) => !v)}>
            <Text style={[styles.brand, { color: c.primary }]}>TrailGuard</Text>
          </Pressable>
          <Text style={[styles.sub, { color: c.muted }]}>Yala National Park · Field ops</Text>
        </View>
        <Pressable
          onPress={toggleTheme}
          style={[styles.themeBtn, { borderColor: c.border, backgroundColor: c.surface }]}
          accessibilityLabel="Toggle Theme"
        >
          <Text style={{ color: c.fg, fontWeight: '700', fontSize: 11 }}>
            {night ? 'Day' : 'Night'}
          </Text>
        </Pressable>
      </View>

      <View style={[styles.actorCard, { backgroundColor: c.surface, borderColor: c.primary }]}>
        <View style={styles.actorHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actorTitle, { color: c.fg }]}>{session.title}</Text>
            <Text style={[styles.actorBadgeId, { color: c.primary }]}>
              {session.userId}
            </Text>
          </View>
          <View style={[styles.roleChip, { backgroundColor: c.primary }]}>
            <Text style={styles.roleChipText}>{session.role}</Text>
          </View>
        </View>
        <Text style={[styles.mission, { color: c.muted }]}>{actorMission(session.role)}</Text>

        {showEngineer && showDevSwitch ? (
          <>
            <Text style={[styles.quickSwitchLabel, { color: c.muted }]}>Dev · switch actor</Text>
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
                      style={[styles.switchChipText, { color: isCurrent ? c.accentFg : c.fg }]}
                    >
                      {a.role}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}
      </View>

      {showSync ? (
        <View style={[styles.syncCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={styles.syncHeader}>
            <Text style={[styles.syncTitle, { color: c.fg }]}>Field data sync</Text>
            <View
              style={[
                styles.pendingBadge,
                {
                  backgroundColor:
                    pending > 0 ? 'rgba(217, 119, 6, 0.15)' : 'rgba(46, 125, 80, 0.15)',
                },
              ]}
            >
              <Text
                style={[styles.pendingBadgeText, { color: pending > 0 ? c.warn : c.success }]}
              >
                {pending > 0 ? `${pending} pending` : 'Queue clear'}
              </Text>
            </View>
          </View>
          {pending > 0 ? (
            <Text style={{ color: c.warn, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
              Offline / pending — data stays on this phone until Sync acknowledges it.
            </Text>
          ) : null}
          <Pressable style={[styles.syncBtn, { backgroundColor: c.primary }]} onPress={sync}>
            <Text style={[styles.syncBtnT, { color: c.accentFg }]}>
              {pending > 0 ? `Sync field data (${pending})` : 'Sync field data'}
            </Text>
          </Pressable>
          {showPull ? (
            <Pressable
              style={[styles.pullBtn, { borderColor: c.border, backgroundColor: c.elevated }]}
              onPress={async () => {
                await refreshHealth();
                Alert.alert('Shared DB', healthLine);
              }}
            >
              <Text style={{ color: c.fg, fontWeight: '700', fontSize: 13 }}>
                Check shared park DB
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {showEngineer ? (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: healthOk ? c.elevated : c.surface,
              borderColor: healthOk ? c.primary : c.warn,
            },
          ]}
        >
          <Text style={{ color: healthOk ? c.primary : c.warn, fontSize: 12, fontWeight: '800' }}>
            {healthOk ? '● Backend connected' : '⚠ Backend unreachable'}
          </Text>
          <Text style={{ color: c.fg, fontSize: 12, fontWeight: '600', marginTop: 2 }}>
            {healthLine}
          </Text>
        </View>
      ) : null}

      {(session.role === 'RANGER' || session.role === 'MANAGER' || session.role === 'SUPER_ADMIN') && (
        <>
          <Text style={[styles.sectionHeading, { color: c.fg }]}>Sector map</Text>
          <OfflineMap mode="overview" />
        </>
      )}

      <Text style={[styles.sectionHeading, { color: c.fg }]}>Your workspace</Text>
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

      {showEngineer ? (
        <>
          <Text style={[styles.label, { color: c.muted, marginTop: 12 }]}>
            API base (/api/v1) — admin
          </Text>
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
          {getBuildDefaultApiBase() ? (
            <Text style={{ color: c.muted, fontSize: 11, marginBottom: 8 }}>
              Build default is set
            </Text>
          ) : null}
        </>
      ) : null}

      <Pressable
        style={[styles.signOut, { borderColor: c.border, backgroundColor: c.surface }]}
        onPress={() => {
          setSession(null);
          navigation.replace('Login');
        }}
      >
        <Text style={{ color: c.muted, fontWeight: '700', textAlign: 'center' }}>Sign out</Text>
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
  actorHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  actorTitle: { fontSize: 16, fontWeight: '800' },
  actorBadgeId: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  roleChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  roleChipText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  mission: { fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  quickSwitchLabel: { fontSize: 11, fontWeight: '700', marginTop: 10, marginBottom: 6 },
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
  syncCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  syncHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
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
  pullBtn: {
    marginTop: 8,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeading: { fontSize: 15, fontWeight: '800', marginTop: 8, marginBottom: 10 },
  useCaseCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  useCaseTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  useCaseTitle: { fontSize: 15, fontWeight: '700', flex: 1, paddingRight: 8 },
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
