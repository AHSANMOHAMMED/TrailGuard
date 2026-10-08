import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { DEFAULT_ACCESS, type Area, type Role } from '../roles';
import { getSession, updateSessionAccess } from '../session';
import { getColors, subscribeTheme } from '../theme';

const TOGGLE_AREAS: Area[] = ['patrol', 'incidents', 'alerts', 'conflict', 'reports', 'radio'];

export default function AdminScreen({
  navigation,
}: {
  navigation: { navigate: (r: string) => void; replace: (r: string) => void };
}) {
  const session = getSession();
  const [access, setAccess] = useState<Record<Role, Area[]>>({ ...DEFAULT_ACCESS });
  const [, bump] = useState(0);
  useEffect(() => subscribeTheme(() => bump((n) => n + 1)), []);
  const c = getColors();

  useEffect(() => {
    if (!session || session.role !== 'SUPER_ADMIN') {
      navigation.replace(session ? 'Home' : 'Login');
    }
  }, [session, navigation]);

  if (!session || session.role !== 'SUPER_ADMIN') return null;

  const toggle = (role: Role, area: Area) => {
    setAccess((prev) => {
      const cur = prev[role];
      const next = cur.includes(area) ? cur.filter((a) => a !== area) : [...cur, area];
      return { ...prev, [role]: next };
    });
  };

  const staff = (Object.keys(DEFAULT_ACCESS) as Role[]).filter((r) => r !== 'SUPER_ADMIN');

  return (
    <ScrollView style={[styles.wrap, { backgroundColor: c.bg }]} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={[styles.title, { color: c.fg }]}>Role admin</Text>
      <Text style={[styles.sub, { color: c.muted }]}>
        Divide which areas each actor may open. Applied when they next open Home on this device.
      </Text>
      {staff.map((role) => (
        <View key={role} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.role, { color: c.fg }]}>{role}</Text>
          <View style={styles.row}>
            {TOGGLE_AREAS.map((area) => {
              const on = access[role].includes(area);
              return (
                <Pressable
                  key={area}
                  onPress={() => toggle(role, area)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: on ? c.accent : c.elevated,
                      borderColor: c.border,
                    },
                  ]}
                >
                  <Text style={{ color: on ? c.accentFg : c.muted, fontSize: 11, fontWeight: '700' }}>
                    {area}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <Pressable
        style={[styles.btn, { backgroundColor: c.accent }]}
        onPress={() => {
          // Persist matrix into session for demo; other logins use DEFAULT until re-opened Admin.
          (globalThis as typeof globalThis & { __tgAccess?: Record<Role, Area[]> }).__tgAccess =
            access;
          updateSessionAccess(access.SUPER_ADMIN);
          navigation.navigate('Home');
        }}
      >
        <Text style={{ color: c.accentFg, textAlign: 'center', fontWeight: '700' }}>
          Save &amp; open Home
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: '700', marginTop: 8 },
  sub: { marginTop: 6, marginBottom: 16, lineHeight: 18 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
  role: { fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  btn: { padding: 16, borderRadius: 12, marginTop: 8 },
});
