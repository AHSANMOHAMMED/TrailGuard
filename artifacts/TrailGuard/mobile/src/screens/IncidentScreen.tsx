import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, TextInput } from 'react-native';
import { createIncident } from '../services/incidentService';
import { synchronize } from '../services/syncService';
import { getSession } from '../session';
import { getColors, subscribeTheme } from '../theme';

const TYPES = ['Snare', 'Carcass', 'Illegal Campsite', 'Footprints'] as const;

export default function IncidentScreen({
  navigation,
}: {
  navigation: { replace: (r: string) => void };
}) {
  const session = getSession();
  const [, bump] = useState(0);
  const [last, setLast] = useState('—');
  const [type, setType] = useState<(typeof TYPES)[number]>('Snare');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState('6.41');
  const [lng, setLng] = useState('81.12');
  const [photoUri, setPhotoUri] = useState('');

  useEffect(() => subscribeTheme(() => bump((n) => n + 1)), []);
  const c = getColors();

  useEffect(() => {
    if (!session) {
      navigation.replace('Login');
      return;
    }
    if (!session.access.includes('incidents')) {
      navigation.replace('Home');
    }
  }, [session, navigation]);

  if (!session || !session.access.includes('incidents')) return null;

  const save = () => {
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!description.trim()) {
      Alert.alert('Incident', 'Description is required.');
      return;
    }
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) {
      Alert.alert('Incident', 'Enter valid lat / lng.');
      return;
    }
    const ir = createIncident({
      parkId: 'park-yala',
      type,
      description: description.trim(),
      geo: { lat: latN, lng: lngN },
      locationSource: 'MANUAL',
      photoUri: photoUri.trim() || undefined,
    });
    setLast(`${ir.reportId.slice(0, 8)} · PENDING`);
  };

  const sync = async () => {
    const r = await synchronize();
    Alert.alert('Sync', `Incidents: ${r.incidents}\n${r.errors.join('; ') || 'ok'}`);
  };

  return (
    <View style={[styles.wrap, { backgroundColor: c.bg }]}>
      <Text style={[styles.h, { color: c.fg }]}>New incident (offline OK)</Text>
      <Text style={[styles.meta, { color: c.muted }]}>Last: {last}</Text>

      <Text style={[styles.label, { color: c.muted }]}>Type</Text>
      <View style={styles.typeRow}>
        {TYPES.map((t) => (
          <Pressable
            key={t}
            onPress={() => setType(t)}
            style={[
              styles.chip,
              {
                backgroundColor: type === t ? c.accent : c.elevated,
                borderColor: c.border,
              },
            ]}
          >
            <Text style={{ color: type === t ? c.accentFg : c.fg, fontSize: 11, fontWeight: '700' }}>
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: c.muted }]}>Description</Text>
      <TextInput
        style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.border, color: c.fg }]}
        value={description}
        onChangeText={setDescription}
        placeholder="What was observed?"
        placeholderTextColor={c.muted}
      />

      <View style={styles.geoRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: c.muted }]}>Lat</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.border, color: c.fg }]}
            value={lat}
            onChangeText={setLat}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: c.muted }]}>Lng</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.border, color: c.fg }]}
            value={lng}
            onChangeText={setLng}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <Text style={[styles.label, { color: c.muted }]}>Photo URI (optional)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.border, color: c.fg }]}
        value={photoUri}
        onChangeText={setPhotoUri}
        autoCapitalize="none"
        placeholder="Leave empty if no photo yet"
        placeholderTextColor={c.muted}
      />

      <Pressable style={[styles.btn, { backgroundColor: c.accent }]} onPress={save}>
        <Text style={[styles.btnT, { color: c.accentFg }]}>Save report</Text>
      </Pressable>
      <Pressable style={[styles.btn, { backgroundColor: c.accent }]} onPress={sync}>
        <Text style={[styles.btnT, { color: c.accentFg }]}>Sync (complete-receipt)</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20 },
  h: { fontSize: 18, fontWeight: '700' },
  meta: { marginVertical: 8 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    marginBottom: 10,
  },
  geoRow: { flexDirection: 'row', gap: 10 },
  btn: { padding: 16, borderRadius: 12, marginBottom: 10 },
  btnT: { textAlign: 'center', fontWeight: '700' },
});
