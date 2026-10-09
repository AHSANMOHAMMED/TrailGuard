import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput } from 'react-native';
import OfflineMap from '../components/OfflineMap';
import { getSession } from '../session';
import { getColors, subscribeTheme } from '../theme';

type Step =
  | 'incoming'
  | 'details'
  | 'acknowledged'
  | 'response_map'
  | 'coordination'
  | 'in_progress'
  | 'resolve'
  | 'resolved';

const OUTCOMES = [
  'Animal left the risk zone',
  'Situation monitored – no further risk',
  'Other outcome',
];

export default function AlertScreen({
  navigation,
}: {
  navigation: { replace: (r: string) => void; navigate: (r: string) => void };
}) {
  const session = getSession();
  const [, bump] = useState(0);
  useEffect(() => subscribeTheme(() => bump((n) => n + 1)), []);
  const c = getColors();

  const [step, setStep] = useState<Step>('incoming');
  const [selectedOutcome, setSelectedOutcome] = useState(OUTCOMES[0]);
  const [resolutionNote, setResolutionNote] = useState('Animal returned to park; no damage reported.');
  const [resolvedTime, setResolvedTime] = useState('07:35');

  useEffect(() => {
    if (!session) {
      navigation.replace('Login');
      return;
    }
    if (!session.access.includes('alerts')) {
      navigation.replace('Home');
    }
  }, [session, navigation]);

  if (!session || !session.access.includes('alerts')) return null;

  return (
    <ScrollView style={[styles.wrap, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      {/* 1. INCOMING WILDLIFE RISK ALERT */}
      {step === 'incoming' && (
        <View>
          <View style={[styles.dangerBanner, { backgroundColor: c.danger }]}>
            <Text style={styles.dangerBannerText}>▲ HIGH RISK · NEW</Text>
          </View>

          <Text style={[styles.h1, { color: c.fg }]}>Elephant Near Farmland</Text>
          <Text style={[styles.subText, { color: c.muted }]}>
            Tracked Animal EL-07 · Risk Zone: Farmland{'\n'}
            Detected 06:52 · Nagoda east, near canal
          </Text>

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Animal / Collar</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>Elephant · EL-07</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Risk Zone</Text>
              <Text style={[styles.gridVal, { color: c.danger }]}>Farmland (HIGH)</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Detection Time</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>06:52</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Status</Text>
              <View style={[styles.badge, { backgroundColor: 'rgba(220, 38, 38, 0.12)' }]}>
                <Text style={[styles.badgeText, { color: c.danger }]}>● NEW</Text>
              </View>
            </View>
          </View>

          <View style={[styles.hintCard, { backgroundColor: c.elevated, borderColor: c.border }]}>
            <Text style={[styles.hintText, { color: c.muted }]}>
              ℹ️ Pre-configured geofence triggered. Risk alert generated and pushed to nearest patrol & liaison.
            </Text>
          </View>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => setStep('details')}
          >
            <Text style={styles.primaryBtnText}>View Alert Details →</Text>
          </Pressable>
        </View>
      )}

      {/* 2. ALERT DETAILS */}
      {step === 'details' && (
        <View>
          <View style={[styles.dangerBanner, { backgroundColor: c.danger }]}>
            <Text style={styles.dangerBannerText}>▲ HIGH RISK · ELEPHANT NEAR FARMLAND</Text>
          </View>

          <View style={styles.statusMetaRow}>
            <Text style={[styles.metaStatusText, { color: c.danger }]}>● NEW</Text>
            <Text style={[styles.metaTimeText, { color: c.muted }]}>Detected 06:52</Text>
          </View>

          <OfflineMap mode="alert" />

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Animal</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>Elephant</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Collar ID</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>EL-07</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Target Zone</Text>
              <Text style={[styles.gridVal, { color: c.danger }]}>Farmland</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Distance</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>≈ 1.2 km</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Severity</Text>
              <Text style={[styles.gridVal, { color: c.danger }]}>HIGH RISK</Text>
            </View>
          </View>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => setStep('acknowledged')}
          >
            <Text style={styles.primaryBtnText}>Acknowledge Alert</Text>
          </Pressable>
        </View>
      )}

      {/* 3. ALERT ACKNOWLEDGED */}
      {step === 'acknowledged' && (
        <View>
          <View style={styles.statusRow}>
            <View style={[styles.badge, { backgroundColor: 'rgba(220, 38, 38, 0.12)' }]}>
              <Text style={[styles.badgeText, { color: c.danger }]}>▲ HIGH RISK</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: 'rgba(46, 125, 80, 0.12)' }]}>
              <Text style={[styles.badgeText, { color: c.success }]}>● ACKNOWLEDGED</Text>
            </View>
          </View>

          <OfflineMap mode="alert" />

          <View style={[styles.successCard, { backgroundColor: c.surface, borderColor: c.success }]}>
            <Text style={[styles.successTitle, { color: c.success }]}>✓ ACKNOWLEDGED</Text>
            <Text style={[styles.successDesc, { color: c.fg }]}>
              You are now responding to this alert. Field notification dispatches recorded.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Animal</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>Elephant · EL-07</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Zone</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>Farmland</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Distance</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>≈ 1.2 km</Text>
            </View>
          </View>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => setStep('response_map')}
          >
            <Text style={styles.primaryBtnText}>Navigate / Respond →</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryBtn, { borderColor: c.border, backgroundColor: c.surface }]}
            onPress={() => setStep('coordination')}
          >
            <Text style={[styles.secondaryBtnText, { color: c.fg }]}>Coordinate with Liaison</Text>
          </Pressable>
        </View>
      )}

      {/* 4. RESPONSE MAP */}
      {step === 'response_map' && (
        <View>
          <Text style={[styles.h1, { color: c.fg }]}>Respond to Risk Alert</Text>
          <View style={[styles.statusChip, { backgroundColor: c.elevated }]}>
            <Text style={[styles.statusChipText, { color: c.primary }]}>
              ● ACKNOWLEDGED · Heading NE · Nagoda east field
            </Text>
          </View>

          <OfflineMap mode="alert" />

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Target Animal</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>Elephant</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Risk Zone</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>Farmland</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Proximity</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>≈ 1.2 km</Text>
            </View>
          </View>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => setStep('coordination')}
          >
            <Text style={styles.primaryBtnText}>Continue Response</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryBtn, { borderColor: c.border, backgroundColor: c.surface }]}
            onPress={() => setStep('acknowledged')}
          >
            <Text style={[styles.secondaryBtnText, { color: c.fg }]}>Back to Alert</Text>
          </Pressable>
        </View>
      )}

      {/* 5. RESPONSE COORDINATION */}
      {step === 'coordination' && (
        <View>
          <Text style={[styles.h1, { color: c.fg }]}>Coordinated Response</Text>
          <Text style={[styles.subText, { color: c.muted }]}>
            Shared response status for this alert across field units.
          </Text>

          <View style={[styles.actorResponseCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.actorHeader}>
              <Text style={[styles.actorTitle, { color: c.fg }]}>👮 Ranger (RN-402)</Text>
              <View style={[styles.badge, { backgroundColor: 'rgba(46, 125, 80, 0.12)' }]}>
                <Text style={[styles.badgeText, { color: c.success }]}>● Responding</Text>
              </View>
            </View>
            <Text style={[styles.actorDetail, { color: c.muted }]}>
              En route to farmland sector perimeter.
            </Text>
          </View>

          <View style={[styles.actorResponseCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.actorHeader}>
              <Text style={[styles.actorTitle, { color: c.fg }]}>🤝 Community Liaison Officer</Text>
              <View style={[styles.badge, { backgroundColor: 'rgba(46, 125, 80, 0.12)' }]}>
                <Text style={[styles.badgeText, { color: c.success }]}>● Notified / responding</Text>
              </View>
            </View>
            <Text style={[styles.actorDetail, { color: c.muted }]}>
              Alerting boundary farmers & village head.
            </Text>
          </View>

          <View style={[styles.badge, { backgroundColor: c.elevated, alignSelf: 'flex-start', marginVertical: 10 }]}>
            <Text style={[styles.badgeText, { color: c.muted }]}>
              ● ACKNOWLEDGED · Elephant · EL-07 · Farmland
            </Text>
          </View>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => setStep('in_progress')}
          >
            <Text style={styles.primaryBtnText}>Continue to Field Operations</Text>
          </Pressable>
        </View>
      )}

      {/* 6. RESPONSE IN PROGRESS */}
      {step === 'in_progress' && (
        <View>
          <View style={[styles.badge, { backgroundColor: 'rgba(46, 125, 80, 0.15)', alignSelf: 'flex-start', marginBottom: 8 }]}>
            <Text style={[styles.badgeText, { color: c.success }]}>● RESPONSE IN PROGRESS</Text>
          </View>

          <OfflineMap mode="alert" />

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Tracked Animal</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>Elephant · EL-07</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Risk Zone</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>Farmland</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Current Status</Text>
              <Text style={[styles.gridVal, { color: c.primary }]}>ACKNOWLEDGED</Text>
            </View>
          </View>

          <Text style={[styles.hintText, { color: c.muted, marginBottom: 16 }]}>
            Field team monitoring the animal near the risk boundary.
          </Text>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => setStep('resolve')}
          >
            <Text style={styles.primaryBtnText}>Resolve Alert</Text>
          </Pressable>
        </View>
      )}

      {/* 7. RESOLVE RISK ALERT */}
      {step === 'resolve' && (
        <View>
          <Text style={[styles.h1, { color: c.fg }]}>Resolve Risk Alert</Text>
          <Text style={[styles.subText, { color: c.muted }]}>
            Elephant Near Farmland · EL-07
          </Text>

          <Text style={[styles.sectionHeading, { color: c.fg }]}>Outcome / Resolution</Text>
          {OUTCOMES.map((opt) => (
            <Pressable
              key={opt}
              style={[
                styles.outcomeOption,
                {
                  backgroundColor: selectedOutcome === opt ? c.elevated : c.surface,
                  borderColor: selectedOutcome === opt ? c.primary : c.border,
                },
              ]}
              onPress={() => setSelectedOutcome(opt)}
            >
              <View
                style={[
                  styles.radioOuter,
                  { borderColor: selectedOutcome === opt ? c.primary : c.border },
                ]}
              >
                {selectedOutcome === opt && (
                  <View style={[styles.radioInner, { backgroundColor: c.primary }]} />
                )}
              </View>
              <Text style={[styles.outcomeText, { color: c.fg }]}>{opt}</Text>
            </Pressable>
          ))}

          <Text style={[styles.sectionHeading, { color: c.fg, marginTop: 14 }]}>
            Resolution note (optional)
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.border, color: c.fg }]}
            value={resolutionNote}
            onChangeText={setResolutionNote}
            placeholder="Describe outcome..."
            placeholderTextColor={c.muted}
          />

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => {
              setResolvedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
              setStep('resolved');
            }}
          >
            <Text style={styles.primaryBtnText}>Mark as Resolved</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryBtn, { borderColor: c.border, backgroundColor: c.surface }]}
            onPress={() => setStep('in_progress')}
          >
            <Text style={[styles.secondaryBtnText, { color: c.fg }]}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {/* 8. ALERT RESOLVED */}
      {step === 'resolved' && (
        <View style={styles.resolvedContainer}>
          <View style={[styles.checkCircle, { backgroundColor: c.success }]}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: 'rgba(46, 125, 80, 0.15)', alignSelf: 'center', marginTop: 12 }]}>
            <Text style={[styles.badgeText, { color: c.success }]}>● RESOLVED</Text>
          </View>

          <Text style={[styles.h1, { color: c.fg, textAlign: 'center', marginTop: 6 }]}>
            Elephant Near Farmland
          </Text>
          <Text style={[styles.subText, { color: c.muted, textAlign: 'center', marginBottom: 16 }]}>
            Resolved {resolvedTime}
          </Text>

          <OfflineMap mode="overview" />

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Animal</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>Elephant · EL-07</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Risk Zone</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>Farmland</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Final Status</Text>
              <Text style={[styles.gridVal, { color: c.success }]}>RESOLVED</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Resolution Outcome</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{selectedOutcome}</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Notes</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{resolutionNote}</Text>
            </View>
          </View>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.primaryBtnText}>Done · Back to Field Hub</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { padding: 18, paddingTop: 20, paddingBottom: 40 },
  dangerBanner: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  dangerBannerText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  h1: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  subText: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  gridKey: { fontSize: 13, fontWeight: '600' },
  gridVal: { fontSize: 13, fontWeight: '700' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '800' },
  hintCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  hintText: { fontSize: 12, lineHeight: 17 },
  primaryBtn: {
    height: 52,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700' },
  statusMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  metaStatusText: { fontSize: 12, fontWeight: '800' },
  metaTimeText: { fontSize: 12, fontWeight: '600' },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  successCard: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  successTitle: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  successDesc: { fontSize: 12, lineHeight: 17 },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 10,
  },
  statusChipText: { fontSize: 12, fontWeight: '700' },
  actorResponseCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  actorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  actorTitle: { fontSize: 14, fontWeight: '700' },
  actorDetail: { fontSize: 12 },
  sectionHeading: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  outcomeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  outcomeText: { fontSize: 13, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
  },
  resolvedContainer: { alignItems: 'stretch' },
  checkCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: { color: '#FFFFFF', fontSize: 28, fontWeight: '900' },
});
