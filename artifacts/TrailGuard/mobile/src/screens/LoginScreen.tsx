import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Alert, ScrollView } from 'react-native';
import { sessionFromLogin, setSession } from '../session';
import type { Role } from '../roles';
import { getColors, subscribeTheme, toggleTheme, getTheme } from '../theme';

export interface AccountOption {
  userId: string;
  role: Role;
  title: string;
  roleDesc: string;
  pin: string;
  badge: string;
}

export const ACCOUNTS: AccountOption[] = [
  {
    userId: 'RN-402',
    role: 'RANGER',
    title: 'Field Ranger (RN-402)',
    roleDesc: 'Conducts patrols, logs incidents, acknowledges wildlife risk alerts',
    pin: '4021',
    badge: 'UC01 · UC02 · UC03',
  },
  {
    userId: 'liaison',
    role: 'LIAISON',
    title: 'Community Liaison Officer',
    roleDesc: 'Coordinates community warnings, monitors HWC reports & alerts',
    pin: '7312',
    badge: 'UC03 · UC04',
  },
  {
    userId: 'manager',
    role: 'MANAGER',
    title: 'Park Operations Manager',
    roleDesc: 'Assigns patrol routes, audits coverage, monitors live park status',
    pin: '8450',
    badge: 'Desk Operations',
  },
  {
    userId: 'community',
    role: 'COMMUNITY',
    title: 'Community Member / Villager',
    roleDesc: 'Submits elephant sightings, crop damage & boundary conflict reports',
    pin: '1111',
    badge: 'UC04 Reporter',
  },
  {
    userId: 'researcher',
    role: 'RESEARCHER',
    title: 'Conservation Researcher',
    roleDesc: 'Monitors long-term animal corridors, patrol density & conflict trends',
    pin: '5260',
    badge: 'Analytics',
  },
  {
    userId: 'admin',
    role: 'SUPER_ADMIN',
    title: 'System Administrator',
    roleDesc: 'Full administrative access and actor permission matrix management',
    pin: '9999',
    badge: 'Admin Access',
  },
];

type Props = {
  navigation: { replace: (r: string) => void };
};

export default function LoginScreen({ navigation }: Props) {
  const [userId, setUserId] = useState('RN-402');
  const [pin, setPin] = useState('4021');
  const [, bump] = useState(0);
  useEffect(() => subscribeTheme(() => bump((n) => n + 1)), []);
  const c = getColors();
  const night = getTheme() === 'night';

  const submit = (overrideUser?: string, overridePin?: string) => {
    const idToUse = (overrideUser ?? userId).trim().toLowerCase();
    const pinToUse = (overridePin ?? pin).trim();

    const hit = ACCOUNTS.find(
      (a) =>
        (a.userId.toLowerCase() === idToUse || a.role.toLowerCase() === idToUse) &&
        a.pin === pinToUse
    );

    if (!hit) {
      Alert.alert('Authentication Failed', 'Invalid User ID or Field PIN. Please select a pre-configured role below or check your credentials.');
      setPin('');
      return;
    }

    setSession(sessionFromLogin(hit.role, hit.title, hit.userId));
    navigation.replace(hit.role === 'SUPER_ADMIN' ? 'Admin' : 'Home');
  };

  const selectAccount = (acc: AccountOption, autoLogin = false) => {
    setUserId(acc.userId);
    setPin(acc.pin);
    if (autoLogin) {
      submit(acc.userId, acc.pin);
    }
  };

  return (
    <ScrollView style={[styles.wrap, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      {/* Top Bar */}
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.brand, { color: c.primary }]}>TrailGuard</Text>
          <Text style={[styles.brandSub, { color: c.muted }]}>
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

      <Text style={[styles.screenHeading, { color: c.fg }]}>Field Officer & Actor Sign In</Text>
      <Text style={[styles.screenDesc, { color: c.muted }]}>
        Authenticate with your Field ID and 4-digit PIN. Tap any assigned actor persona below for quick role switching and grading verification.
      </Text>

      {/* Inputs Card */}
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.label, { color: c.muted }]}>USER ID / FIELD BADGE</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: c.inputBg, borderColor: c.border, color: c.fg },
          ]}
          value={userId}
          onChangeText={setUserId}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="e.g. RN-402, liaison, manager"
          placeholderTextColor={c.muted}
        />

        <Text style={[styles.label, { color: c.muted }]}>FIELD PIN (4 DIGITS)</Text>
        <TextInput
          style={[
            styles.input,
            { backgroundColor: c.inputBg, borderColor: c.border, color: c.fg },
          ]}
          value={pin}
          onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
          placeholder="••••"
          placeholderTextColor={c.muted}
        />

        <Pressable
          style={[styles.btn, { backgroundColor: c.primary }]}
          onPress={() => submit()}
        >
          <Text style={[styles.btnT, { color: c.accentFg }]}>Sign In to TrailGuard</Text>
        </Pressable>
      </View>

      {/* Quick Actor Selector Section */}
      <View style={styles.actorSection}>
        <View style={styles.actorHeaderRow}>
          <Text style={[styles.actorSectionTitle, { color: c.fg }]}>Demo Actor Accounts</Text>
          <Text style={[styles.actorSectionSub, { color: c.muted }]}>1-Tap to Test Personas</Text>
        </View>

        {ACCOUNTS.map((acc) => {
          const isSelected = acc.userId.toLowerCase() === userId.trim().toLowerCase();
          return (
            <Pressable
              key={acc.userId}
              style={[
                styles.actorCard,
                {
                  backgroundColor: isSelected ? c.elevated : c.surface,
                  borderColor: isSelected ? c.primary : c.border,
                },
              ]}
              onPress={() => selectAccount(acc, false)}
            >
              <View style={styles.actorCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actorCardTitle, { color: c.fg }]}>{acc.title}</Text>
                  <Text style={[styles.actorCardId, { color: c.primary }]}>
                    ID: {acc.userId} · PIN: {acc.pin}
                  </Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: c.border }]}>
                  <Text style={[styles.roleBadgeText, { color: c.fg }]}>{acc.badge}</Text>
                </View>
              </View>
              <Text style={[styles.actorDesc, { color: c.muted }]}>{acc.roleDesc}</Text>

              <Pressable
                style={[styles.instantBtn, { backgroundColor: c.secondary }]}
                onPress={() => selectAccount(acc, true)}
              >
                <Text style={styles.instantBtnText}>Sign In as {acc.role} →</Text>
              </Pressable>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.footerText, { color: c.muted }]}>
        SE3070 Wildlife Conservation System · Works 100% Offline with Local SQLite
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { padding: 18, paddingTop: 48, paddingBottom: 40 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  brand: { fontSize: 24, fontWeight: '800', letterSpacing: 0.5 },
  brandSub: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  themeBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  screenHeading: { fontSize: 20, fontWeight: '800', marginTop: 8, marginBottom: 4 },
  screenDesc: { fontSize: 13, lineHeight: 18, marginBottom: 16 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
  },
  btn: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  btnT: { fontSize: 15, fontWeight: '700' },
  actorSection: { marginBottom: 20 },
  actorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  actorSectionTitle: { fontSize: 15, fontWeight: '800' },
  actorSectionSub: { fontSize: 11, fontWeight: '600' },
  actorCard: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  actorCardTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 },
  actorCardTitle: { fontSize: 14, fontWeight: '700' },
  actorCardId: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: { fontSize: 10, fontWeight: '700' },
  actorDesc: { fontSize: 12, lineHeight: 16, marginBottom: 10 },
  instantBtn: {
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instantBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  footerText: { fontSize: 11, textAlign: 'center', marginTop: 8 },
});
