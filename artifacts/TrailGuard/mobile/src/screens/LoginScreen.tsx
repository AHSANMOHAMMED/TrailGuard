import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Alert } from 'react-native';
import { sessionFromLogin, setSession } from '../session';
import type { Role } from '../roles';
import { getColors, subscribeTheme, toggleTheme, getTheme } from '../theme';

/** userId + PIN — same credentials as the web app (see README). */
const ACCOUNTS: { userId: string; role: Role; title: string; pin: string }[] = [
  { userId: 'admin', role: 'SUPER_ADMIN', title: 'Super Admin', pin: '9999' },
  { userId: 'RN-402', role: 'RANGER', title: 'Ranger', pin: '4021' },
  { userId: 'liaison', role: 'LIAISON', title: 'Liaison', pin: '7312' },
  { userId: 'manager', role: 'MANAGER', title: 'Manager', pin: '8450' },
  { userId: 'researcher', role: 'RESEARCHER', title: 'Researcher', pin: '5260' },
  { userId: 'community', role: 'COMMUNITY', title: 'Community', pin: '1111' },
];

type Props = {
  navigation: { replace: (r: string) => void };
};

export default function LoginScreen({ navigation }: Props) {
  const [userId, setUserId] = useState('');
  const [pin, setPin] = useState('');
  const [, bump] = useState(0);
  useEffect(() => subscribeTheme(() => bump((n) => n + 1)), []);
  const c = getColors();
  const night = getTheme() === 'night';

  const submit = () => {
    const id = userId.trim().toLowerCase();
    const hit = ACCOUNTS.find(
      (a) =>
        (a.userId.toLowerCase() === id || a.role.toLowerCase() === id) && a.pin === pin.trim()
    );
    if (!hit) {
      Alert.alert('Sign-in', 'Wrong user ID or PIN');
      setPin('');
      return;
    }
    setSession(sessionFromLogin(hit.role, hit.title, hit.userId));
    navigation.replace(hit.role === 'SUPER_ADMIN' ? 'Admin' : 'Home');
  };

  return (
    <View style={[styles.wrap, { backgroundColor: c.bg }]}>
      <View style={styles.topRow}>
        <Text style={[styles.brand, { color: c.fg }]}>TrailGuard</Text>
        <Pressable
          onPress={() => toggleTheme()}
          style={[styles.themeBtn, { borderColor: c.border, backgroundColor: c.surface }]}
        >
          <Text style={{ color: c.fg, fontWeight: '700', fontSize: 12 }}>
            {night ? 'Day' : 'Night'}
          </Text>
        </Pressable>
      </View>
      <Text style={[styles.sub, { color: c.muted }]}>Login with your user ID and field PIN</Text>
      <Text style={[styles.label, { color: c.muted }]}>User ID</Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: c.inputBg, borderColor: c.border, color: c.fg },
        ]}
        value={userId}
        onChangeText={setUserId}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="e.g. RN-402"
        placeholderTextColor={c.muted}
      />
      <Text style={[styles.label, { color: c.muted }]}>Field PIN</Text>
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
      <Pressable style={[styles.btn, { backgroundColor: c.accent }]} onPress={submit}>
        <Text style={[styles.btnT, { color: c.accentFg }]}>Sign in</Text>
      </Pressable>
      <Text style={[styles.footer, { color: c.muted }]}>
        Day theme is default · Night optional · works offline
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, justifyContent: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  brand: { fontSize: 28, fontWeight: '700', flex: 1 },
  themeBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sub: { marginBottom: 24, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    fontSize: 16,
    marginBottom: 14,
  },
  btn: { padding: 16, borderRadius: 12, marginTop: 8 },
  btnT: { textAlign: 'center', fontWeight: '700' },
  footer: { fontSize: 11, textAlign: 'center', marginTop: 20 },
});
