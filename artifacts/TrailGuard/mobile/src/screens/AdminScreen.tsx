import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { getSession, setSession } from '../session';

const AREAS = ['patrol', 'incidents', 'alerts', 'conflict', 'reports', 'radio'] as const;
type Area = (typeof AREAS)[number];
type Role = 'RANGER' | 'LIAISON' | 'MANAGER' | 'RESEARCHER' | 'COMMUNITY';

const DEFAULTS: Record<Role, Area[]> = {
  RANGER: ['patrol', 'incidents', 'alerts', 'conflict', 'radio'],
  LIAISON: ['alerts', 'conflict', 'radio'],
  MANAGER: ['alerts', 'reports', 'radio'],
  RESEARCHER: ['reports', 'radio'],
  COMMUNITY: ['conflict', 'radio'],
};

type Props = { navigation: { replace: (r: string) => void; navigate: (r: string) => void } };

export default function AdminScreen({ navigation }: Props) {
  const [access, setAccess] = useState<Record<Role, Area[]>>({ ...DEFAULTS });
  const session = getSession();

  const toggle = (role: Role, area: Area) => {
    setAccess((prev) => {
      const cur = prev[role];
      const next = cur.includes(area) ? cur.filter((a) => a !== area) : [...cur, area];
      return { ...prev, [role]: next };
    });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.h}>Role admin</Text>
      <Text style={styles.sub}>
        {session?.title ?? 'Super Admin'} · divide areas offline (device only)
      </Text>
      {(Object.keys(DEFAULTS) as Role[]).map((role) => (
        <View key={role} style={styles.card}>
          <Text style={styles.role}>{role}</Text>
          <View style={styles.row}>
            {AREAS.map((area) => {
              const on = access[role].includes(area);
              return (
                <Pressable
                  key={area}
                  style={[styles.chip, on && styles.chipOn]}
                  onPress={() => toggle(role, area)}
                >
                  <Text style={[styles.chipT, on && styles.chipTOn]}>{area}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <Pressable style={styles.btn} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.btnT}>Open field home</Text>
      </Pressable>
      <Pressable
        style={styles.btnGhost}
        onPress={() => {
          setSession(null);
          navigation.replace('Login');
        }}
      >
        <Text style={styles.btnGhostT}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: '#0A100C' },
  h: { color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 8 },
  sub: { color: '#8A9E8E', marginBottom: 16 },
  card: {
    backgroundColor: '#141E18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E5038',
    padding: 12,
    marginBottom: 10,
  },
  role: { color: '#E6F0E6', fontWeight: '700', marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: '#2E5038',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipOn: { backgroundColor: '#2EA05F', borderColor: '#2EA05F' },
  chipT: { color: '#8A9E8E', fontSize: 11, fontWeight: '600' },
  chipTOn: { color: '#fff' },
  btn: { backgroundColor: '#2EA05F', padding: 16, borderRadius: 12, marginTop: 8 },
  btnT: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  btnGhost: { padding: 14, marginTop: 8 },
  btnGhostT: { color: '#8A9E8E', textAlign: 'center', fontWeight: '600' },
});
