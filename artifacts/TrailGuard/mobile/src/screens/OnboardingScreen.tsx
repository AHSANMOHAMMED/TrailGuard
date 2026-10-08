import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import OfflineMap from '../components/OfflineMap';

/** Feature tour only — role/user pick happens on Login. */
const STEPS = [
  {
    title: 'Welcome to TrailGuard',
    body: 'Field ops for Yala. This tour describes what is inside — next you sign in with user ID + PIN.',
    bullets: ['Offline SQLite on device', 'Sync when online', 'Maps without network tiles'],
  },
  {
    title: 'Ranger Patrol',
    body: 'Start a route, drop GPS waypoints, finish coverage, and queue sync if you were offline.',
    bullets: ['Start / waypoint / finish', 'Track on offline map', 'Retry failed uploads'],
    showMap: true,
  },
  {
    title: 'Incidents & alerts',
    body: 'Log field incidents with optional photo. Walk HIGH RISK wildlife alerts from ack to resolve.',
    bullets: ['Incident report + photo', 'Collar risk alerts', 'Assign / escalate / close'],
  },
  {
    title: 'Conflict, radio & reports',
    body: 'Community conflict reports, VHF radio callouts, and conservation snapshots for the desk.',
    bullets: ['Conflict submit', 'Field radio channels', 'SYNCED-only reports'],
  },
  {
    title: 'Offline → Sync',
    body: 'Writes stay PENDING on this phone until Sync upserts them by stable UUID.',
    bullets: ['No Neon required on device', 'Works fully offline', 'Then: login with user ID + PIN'],
  },
];

type Props = { navigation: { replace: (r: string) => void } };

export default function OnboardingScreen({ navigation }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <View style={styles.wrap}>
      <Text style={styles.step}>
        Step {step + 1} of {STEPS.length}
      </Text>
      <Text style={styles.h}>{current.title}</Text>
      <Text style={styles.body}>{current.body}</Text>
      {current.showMap ? <OfflineMap /> : null}
      <View style={styles.list}>
        {current.bullets.map((b) => (
          <Text key={b} style={styles.bullet}>
            · {b}
          </Text>
        ))}
      </View>
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
        ))}
      </View>
      {step > 0 ? (
        <Pressable style={styles.back} onPress={() => setStep((s) => s - 1)}>
          <Text style={styles.backT}>Back</Text>
        </Pressable>
      ) : null}
      <Pressable
        style={styles.btn}
        onPress={() => {
          if (step < STEPS.length - 1) setStep(step + 1);
          else navigation.replace('Login');
        }}
      >
        <Text style={styles.btnT}>
          {step === STEPS.length - 1 ? 'Continue to login' : 'Continue'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: '#0A100C', justifyContent: 'center' },
  step: { color: '#5f7366', fontSize: 11, fontWeight: '600', letterSpacing: 0.6, marginBottom: 6 },
  h: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 12 },
  body: { color: '#8A9E8E', fontSize: 15, lineHeight: 22, marginBottom: 16 },
  list: { marginBottom: 20, gap: 6 },
  bullet: { color: '#E6F0E6', fontSize: 13, lineHeight: 20 },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#2E5038' },
  dotOn: { width: 18, backgroundColor: '#2EA05F' },
  back: { paddingVertical: 10, marginBottom: 4 },
  backT: { color: '#8A9E8E', textAlign: 'center', fontWeight: '600' },
  btn: { backgroundColor: '#2EA05F', padding: 16, borderRadius: 12 },
  btnT: { color: '#fff', textAlign: 'center', fontWeight: '700' },
});
