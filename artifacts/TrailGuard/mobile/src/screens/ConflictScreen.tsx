import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, TextInput } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { saveConflict } from '../store/localStore';
import { synchronize } from '../services/syncService';
import { getSession } from '../session';
import { getColors, subscribeTheme } from '../theme';
import type { ConflictRecord } from '../types/models';

const SPECIES = ['Elephant', 'Leopard', 'Boar', 'Other'] as const;
const RISKS = ['LOW', 'MEDIUM', 'HIGH'] as const;

/** UC04 — community / liaison conflict report → SQLite → Sync. */
export default function ConflictScreen({
  navigation,
}: {
  navigation: { replace: (r: string) => void };
}) {
  const session = getSession();
  const [, bump] = useState(0);
  const [last, setLast] = useState('—');
  const [species, setSpecies] = useState<(typeof SPECIES)[number]>('Elephant');
  const [risk, setRisk] = useState<(typeof RISKS)[number]>('MEDIUM');
  const [notes, setNotes] = useState('');
  const [lat, setLat] = useState('6.41');
  const [lng, setLng] = useState('81.12');

  useEffect(() => subscribeTheme(() => bump((n) => n + 1)), []);
  const c = getColors();

  useEffect(() => {
    if (!session) {
      navigation.replace('Login');
      return;
    }
    if (!session.access.includes('conflict')) {
      navigation.replace('Home');
    }
  }, [session, navigation]);

  if (!session || !session.access.includes('conflict')) return null;

  const save = () => {
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!notes.trim()) {
      Alert.alert('Conflict', 'Notes are required.');
      return;
    }
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
      Alert.alert('Conflict', 'Enter valid lat / lng.');
      return;
    }
    const row: ConflictRecord = {
      conflictId: uuidv4(),
      parkId: 'park-yala',
      species,
      riskLevel: risk,
      geo: { lat: latN, lng: lngN },
      observedAt: new Date().toISOString(),
      syncState: 'PENDING',
      notes: notes.trim(),
    };
    saveConflict(row);
    setLast(`${row.conflictId.slice(0, 8)} · PENDING`);
    setNotes('');
  };

  const sync = async () => {
    const r = await synchronize();
    Alert.alert(
      'Sync',
      `Conflicts: ${r.conflicts}\n${r.errors.join('; ') || 'ok'}`,
    );
  };

  return (
    <View style={[styles.wrap, { backgroundColor: c.bg }]}>
      <Text style={[styles.h, { color: c.fg }]}>Conflict report (offline OK)</Text>
      <Text style={[styles.meta, { color: c.muted }]}>Last: {last}</Text>

      <Text style={[styles.label, { color: c.muted }]}>Species</Text>
      <View style={styles.row}>
        {SPECIES.map((s) => (
          <Pressable
            key={s}
            onPress={() => setSpecies(s)}
            style={[
              styles.chip,
              {
                backgroundColor: species === s ? c.accent : c.elevated,
              },
            ]}
          >
            <Text style={{ color: species === s ? c.accentFg : c.fg, fontSize: 12, fontWeight: '600' }}>
              {s}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: c.muted }]}>Risk</Text>
      <View style={styles.row}>
        {RISKS.map((r) => (
          <Pressable
            key={r}
            onPress={() => setRisk(r)}
            style={[
              styles.chip,
              {
                backgroundColor: risk === r ? c.accent : c.elevated,
              },
            ]}
          >
            <Text style={{ color: risk === r ? c.accentFg : c.fg, fontSize: 12, fontWeight: '600' }}>
              {r}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: c.muted }]}>Notes</Text>
      <TextInput
        style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.border, color: c.fg }]}
        value={notes}
        onChangeText={setNotes}
        placeholder="What happened / village contact"
        placeholderTextColor={c.muted}
        multiline
      />

      <Text style={[styles.label, { color: c.muted }]}>Lat / Lng</Text>
      <View style={styles.geoRow}>
        <TextInput
          style={[styles.inputHalf, { backgroundColor: c.inputBg, borderColor: c.border, color: c.fg }]}
          value={lat}
          onChangeText={setLat}
          keyboardType="decimal-pad"
          placeholderTextColor={c.muted}
        />
        <TextInput
          style={[styles.inputHalf, { backgroundColor: c.inputBg, borderColor: c.border, color: c.fg }]}
          value={lng}
          onChangeText={setLng}
          keyboardType="decimal-pad"
          placeholderTextColor={c.muted}
        />
      </View>

      <Pressable style={[styles.btn, { backgroundColor: c.accent }]} onPress={save}>
        <Text style={[styles.btnT, { color: c.accentFg }]}>Save offline</Text>
      </Pressable>
      <Pressable style={[styles.btn, { backgroundColor: c.accent }]} onPress={sync}>
        <Text style={[styles.btnT, { color: c.accentFg }]}>Sync to park DB</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20 },
  h: { fontSize: 18, fontWeight: '700' },
  meta: { marginTop: 8, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: 4,
  },
  geoRow: { flexDirection: 'row', gap: 8 },
  inputHalf: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  btn: { padding: 16, borderRadius: 12, marginTop: 8 },
  btnT: { textAlign: 'center', fontWeight: '700' },
});
