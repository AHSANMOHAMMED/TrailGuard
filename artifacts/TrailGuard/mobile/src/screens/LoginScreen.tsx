import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Alert } from 'react-native';
import { setSession } from '../session';

/** userId + PIN — same credentials as the web app (see README). */
const ACCOUNTS = [
  { userId: 'admin', role: 'SUPER_ADMIN', title: 'Super Admin', pin: '9999' },
  { userId: 'RN-402', role: 'RANGER', title: 'Ranger', pin: '4021' },
  { userId: 'liaison', role: 'LIAISON', title: 'Liaison', pin: '7312' },
  { userId: 'manager', role: 'MANAGER', title: 'Manager', pin: '8450' },
  { userId: 'researcher', role: 'RESEARCHER', title: 'Researcher', pin: '5260' },
  { userId: 'community', role: 'COMMUNITY', title: 'Community', pin: '1111' },
] as const;

type Props = {
  navigation: { replace: (r: string) => void };
};

export default function LoginScreen({ navigation }: Props) {
  const [userId, setUserId] = useState('');
  const [pin, setPin] = useState('');

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
    setSession({ role: hit.role, title: hit.title });
    navigation.replace(hit.role === 'SUPER_ADMIN' ? 'Admin' : 'Home');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.brand}>TrailGuard</Text>
      <Text style={styles.sub}>Login with your user ID and field PIN</Text>
      <Text style={styles.label}>User ID</Text>
      <TextInput
        style={styles.input}
        value={userId}
        onChangeText={setUserId}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="e.g. RN-402"
        placeholderTextColor="#5f7366"
      />
      <Text style={styles.label}>Field PIN</Text>
      <TextInput
        style={styles.input}
        value={pin}
        onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={4}
        placeholder="••••"
        placeholderTextColor="#5f7366"
      />
      <Pressable style={styles.btn} onPress={submit}>
        <Text style={styles.btnT}>Sign in</Text>
      </Pressable>
      <Text style={styles.footer}>Credentials are in the project README · works offline</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: '#0A100C', justifyContent: 'center' },
  brand: { color: '#fff', fontSize: 28, fontWeight: '700', marginBottom: 6 },
  sub: { color: '#8A9E8E', marginBottom: 24, lineHeight: 20 },
  label: { color: '#8A9E8E', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: '#141E18',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2E5038',
    color: '#fff',
    padding: 14,
    fontSize: 16,
    marginBottom: 14,
  },
  btn: { backgroundColor: '#2EA05F', padding: 16, borderRadius: 12, marginTop: 8 },
  btnT: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  footer: { color: '#5f7366', fontSize: 11, textAlign: 'center', marginTop: 20 },
});
