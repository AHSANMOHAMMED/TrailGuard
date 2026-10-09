import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import OfflineMap from '../components/OfflineMap';
import { saveConflict } from '../store/localStore';
import type { ConflictRecord } from '../types/models';
import { getSession } from '../session';
import { getColors, subscribeTheme } from '../theme';
import { isConflictStaff, isConflictSubmitter } from '../actor-capabilities';

type ConflictStep =
  | 'overview'
  | 'channel_select'
  | 'details_input'
  | 'review'
  | 'offline_stored'
  | 'submitted'
  | 'staff_desk'
  | 'staff_review'
  | 'staff_responded';

const CONFLICT_TYPES = [
  'Elephant Sighting',
  'Crop Raiding',
  'Other Conflict',
];

export default function ConflictScreen({
  navigation,
}: {
  navigation: { replace: (r: string) => void; navigate: (r: string) => void };
}) {
  const session = getSession();
  const [, bump] = useState(0);
  useEffect(() => subscribeTheme(() => bump((n) => n + 1)), []);
  const c = getColors();

  const isStaff = isConflictStaff(session?.role);
  const canSubmit = isConflictSubmitter(session?.role) || isStaff;

  const [step, setStep] = useState<ConflictStep>(() =>
    isConflictStaff(getSession()?.role) ? 'staff_desk' : 'overview'
  );
  const [channel, setChannel] = useState<'Mobile App' | 'SMS'>('Mobile App');
  const [conflictType, setConflictType] = useState('Elephant Sighting');
  const [locationName, setLocationName] = useState('Nagoda east field, near the canal');
  const [description, setDescription] = useState(
    'Three elephants in the paddy field near the canal, moving towards the houses.'
  );
  const [responseNotes, setResponseNotes] = useState(
    'Ranger team dispatched with thumper flares; community liaison warned boundary residents.'
  );

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

  const handleSubmit = (simulateOffline = false) => {
    const row: ConflictRecord = {
      conflictId: uuidv4(),
      parkId: 'park-yala',
      species: conflictType,
      riskLevel: 'HIGH',
      geo: { lat: 8.415, lng: 80.408 },
      observedAt: new Date().toISOString(),
      syncState: simulateOffline ? 'PENDING' : 'SYNCED',
      notes: description.trim(),
    };
    saveConflict(row);

    if (simulateOffline) {
      setStep('offline_stored');
    } else {
      setStep('submitted');
    }
  };

  return (
    <ScrollView style={[styles.wrap, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      {/* Staff operations desk first */}
      {step === 'staff_desk' && (
        <View>
          <Text style={[styles.subHeading, { color: c.muted }]}>UC04 · Staff desk</Text>
          <Text style={[styles.h1, { color: c.fg }]}>Conflict operations</Text>
          <Text style={[styles.bodyText, { color: c.muted }]}>
            Review community reports and record responses. Villagers submit; staff close the loop.
          </Text>
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Your role</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{session.title}</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Open queue</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>Review pending reports</Text>
            </View>
          </View>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => setStep('staff_review')}
          >
            <Text style={styles.primaryBtnText}>Open report queue</Text>
          </Pressable>
          {canSubmit ? (
            <Pressable
              style={[styles.secondaryBtn, { borderColor: c.border, backgroundColor: c.surface }]}
              onPress={() => setStep('overview')}
            >
              <Text style={[styles.secondaryBtnText, { color: c.fg }]}>Submit a report (demo)</Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {/* 1. REPORT WILDLIFE CONFLICT OVERVIEW — community / demo submit */}
      {step === 'overview' && (
        <View>
          <Text style={[styles.subHeading, { color: c.muted }]}>Community Boundary Reporting</Text>
          <Text style={[styles.h1, { color: c.fg }]}>Community Conflict Report</Text>
          <Text style={[styles.bodyText, { color: c.muted }]}>
            Report wildlife sightings or conflict near the park.
          </Text>

          <OfflineMap mode="conflict" />

          <Text style={[styles.sectionTitle, { color: c.fg }]}>What you can report</Text>
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.categoryItem}>
              <Text style={styles.catIcon}>🐘</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.catTitle, { color: c.fg }]}>Elephant Sighting</Text>
                <Text style={[styles.catDesc, { color: c.muted }]}>Elephants seen near homes or fields</Text>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <View style={styles.categoryItem}>
              <Text style={styles.catIcon}>🌾</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.catTitle, { color: c.fg }]}>Crop Raiding</Text>
                <Text style={[styles.catDesc, { color: c.muted }]}>Damage to paddy, banana or other crops</Text>
              </View>
            </View>
          </View>

          <Text style={[styles.hintText, { color: c.muted, marginBottom: 14 }]}>
            Reports can also be sent by SMS short code (7444).
          </Text>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => setStep('channel_select')}
          >
            <Text style={styles.primaryBtnText}>Start Report</Text>
          </Pressable>

          {isStaff && (
            <Pressable
              style={[styles.secondaryBtn, { backgroundColor: c.surface, borderColor: c.border }]}
              onPress={() => setStep('staff_desk')}
            >
              <Text style={[styles.secondaryBtnText, { color: c.fg }]}>
                Back to conflict operations desk
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* 2. REPORTING CHANNEL SELECTOR */}
      {step === 'channel_select' && (
        <View>
          <Text style={[styles.subHeading, { color: c.muted }]}>Step 1 of 3</Text>
          <Text style={[styles.h1, { color: c.fg }]}>How would you like to report?</Text>
          <Text style={[styles.bodyText, { color: c.muted }]}>
            Choose one channel – both reach the wildlife team.
          </Text>

          <Pressable
            style={[
              styles.optionRow,
              {
                backgroundColor: channel === 'Mobile App' ? c.elevated : c.surface,
                borderColor: channel === 'Mobile App' ? c.primary : c.border,
              },
            ]}
            onPress={() => setChannel('Mobile App')}
          >
            <View
              style={[
                styles.radioOuter,
                { borderColor: channel === 'Mobile App' ? c.primary : c.border },
              ]}
            >
              {channel === 'Mobile App' && (
                <View style={[styles.radioInner, { backgroundColor: c.primary }]} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionTitle, { color: c.fg }]}>📱 Mobile App</Text>
              <Text style={[styles.optionSub, { color: c.muted }]}>Fill in the report on this device</Text>
            </View>
          </Pressable>

          <Pressable
            style={[
              styles.optionRow,
              {
                backgroundColor: channel === 'SMS' ? c.elevated : c.surface,
                borderColor: channel === 'SMS' ? c.primary : c.border,
              },
            ]}
            onPress={() => setChannel('SMS')}
          >
            <View
              style={[
                styles.radioOuter,
                { borderColor: channel === 'SMS' ? c.primary : c.border },
              ]}
            >
              {channel === 'SMS' && (
                <View style={[styles.radioInner, { backgroundColor: c.primary }]} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.optionTitle, { color: c.fg }]}>💬 SMS Short Code</Text>
              <Text style={[styles.optionSub, { color: c.muted }]}>Text the details to short code 7444</Text>
            </View>
          </Pressable>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary, marginTop: 14 }]}
            onPress={() => setStep('details_input')}
          >
            <Text style={styles.primaryBtnText}>Continue →</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => setStep(isStaff ? 'staff_desk' : 'overview')}
          >
            <Text style={[styles.secondaryBtnText, { color: c.fg }]}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {/* 3. CONFLICT DETAILS */}
      {step === 'details_input' && (
        <View>
          <Text style={[styles.subHeading, { color: c.muted }]}>Step 2 of 3</Text>
          <Text style={[styles.h1, { color: c.fg }]}>Conflict Details</Text>

          <Text style={[styles.fieldLabel, { color: c.fg }]}>Conflict Type</Text>
          {CONFLICT_TYPES.map((t) => (
            <Pressable
              key={t}
              style={[
                styles.miniOptionRow,
                {
                  backgroundColor: conflictType === t ? c.elevated : c.surface,
                  borderColor: conflictType === t ? c.primary : c.border,
                },
              ]}
              onPress={() => setConflictType(t)}
            >
              <View
                style={[
                  styles.radioOuter,
                  { borderColor: conflictType === t ? c.primary : c.border },
                ]}
              >
                {conflictType === t && (
                  <View style={[styles.radioInner, { backgroundColor: c.primary }]} />
                )}
              </View>
              <Text style={[styles.optionText, { color: c.fg }]}>{t}</Text>
            </Pressable>
          ))}

          <Text style={[styles.fieldLabel, { color: c.fg, marginTop: 12 }]}>Incident Location</Text>
          <OfflineMap mode="conflict" />
          <TextInput
            style={[styles.textInput, { backgroundColor: c.inputBg, borderColor: c.border, color: c.fg }]}
            value={locationName}
            onChangeText={setLocationName}
            placeholder="e.g. Nagoda east field, near canal"
            placeholderTextColor={c.muted}
          />

          <Text style={[styles.fieldLabel, { color: c.fg, marginTop: 10 }]}>Short Description</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: c.inputBg, borderColor: c.border, color: c.fg }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe what occurred..."
            placeholderTextColor={c.muted}
            multiline
            numberOfLines={3}
            maxLength={160}
          />
          <Text style={[styles.charCount, { color: c.muted }]}>{description.length} / 160</Text>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => setStep('review')}
          >
            <Text style={styles.primaryBtnText}>Continue →</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => setStep('channel_select')}
          >
            <Text style={[styles.secondaryBtnText, { color: c.fg }]}>Back</Text>
          </Pressable>
        </View>
      )}

      {/* 4. REVIEW REPORT */}
      {step === 'review' && (
        <View>
          <Text style={[styles.subHeading, { color: c.muted }]}>Step 3 of 3</Text>
          <Text style={[styles.h1, { color: c.fg }]}>Review Report</Text>
          <Text style={[styles.bodyText, { color: c.muted }]}>Check the details before sending.</Text>

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Conflict Type</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{conflictType}</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Location</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{locationName}</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Reporting Channel</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{channel}</Text>
            </View>
            <View style={[styles.gridRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Description</Text>
              <Text style={[styles.gridVal, { color: c.fg, flex: 1, textAlign: 'right' }]}>
                {description}
              </Text>
            </View>
          </View>

          <OfflineMap mode="conflict" />

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => handleSubmit(false)}
          >
            <Text style={styles.primaryBtnText}>Submit Report</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryBtn, { backgroundColor: c.surface, borderColor: c.warn }]}
            onPress={() => handleSubmit(true)}
          >
            <Text style={[styles.secondaryBtnText, { color: c.warn }]}>Simulate Offline Submission</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => setStep('details_input')}
          >
            <Text style={[styles.secondaryBtnText, { color: c.fg }]}>Edit Details</Text>
          </Pressable>
        </View>
      )}

      {/* 5. OFFLINE REPORT (CONDITIONAL) */}
      {step === 'offline_stored' && (
        <View>
          <View style={[styles.bannerAlert, { backgroundColor: c.warn }]}>
            <Text style={styles.bannerAlertText}>⚠️ OFFLINE · Report Stored Locally</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: 'rgba(217, 119, 6, 0.15)', alignSelf: 'center', marginBottom: 12 }]}>
            <Text style={[styles.badgeText, { color: c.warn }]}>● STORED LOCALLY</Text>
          </View>

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Conflict Type</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{conflictType}</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Location</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{locationName}</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Reporting Channel</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{channel}</Text>
            </View>
            <View style={styles.pendingCounterRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Pending Sync</Text>
              <Text style={[styles.bigCounter, { color: c.warn }]}>1</Text>
            </View>
            <Text style={[styles.hintText, { color: c.muted }]}>
              Your report will synchronize automatically when connectivity returns.
            </Text>
          </View>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => setStep('submitted')}
          >
            <Text style={styles.primaryBtnText}>OK</Text>
          </Pressable>
        </View>
      )}

      {/* 6. REPORT SUBMITTED */}
      {step === 'submitted' && (
        <View style={styles.centeredContainer}>
          <View style={[styles.circleCheck, { backgroundColor: c.success }]}>
            <Text style={styles.circleCheckIcon}>✓</Text>
          </View>

          <Text style={[styles.h1, { color: c.fg, textAlign: 'center', marginTop: 12 }]}>
            Report Submitted Successfully
          </Text>
          <Text style={[styles.subHeading, { color: c.muted, textAlign: 'center', marginBottom: 14 }]}>
            Wildlife staff will review your report.
          </Text>

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Conflict Type</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{conflictType}</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Location</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{locationName}</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Reporting Channel</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{channel}</Text>
            </View>
          </View>

          <View style={[styles.badge, { backgroundColor: 'rgba(46, 125, 80, 0.15)', alignSelf: 'center', marginVertical: 10 }]}>
            <Text style={[styles.badgeText, { color: c.success }]}>
              📶 Connection restored · synced automatically
            </Text>
          </View>

          {isStaff && (
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: c.secondary }]}
              onPress={() => setStep('staff_review')}
            >
              <Text style={styles.primaryBtnText}>Review as Ranger / Liaison Officer →</Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.primaryBtnText}>Done</Text>
          </Pressable>
        </View>
      )}

      {/* 7. COMMUNITY REPORT REVIEW (STAFF VIEW - FIGURE 18 PANEL 7) */}
      {step === 'staff_review' && (
        <View>
          <View style={styles.headerWithBadge}>
            <Text style={[styles.h1, { color: c.fg }]}>Community Conflict Report</Text>
            <View style={[styles.badge, { backgroundColor: 'rgba(31, 90, 67, 0.12)' }]}>
              <Text style={[styles.badgeText, { color: c.primary }]}>● SUBMITTED</Text>
            </View>
          </View>
          <Text style={[styles.metaTimeText, { color: c.muted, marginBottom: 10 }]}>
            Received 06:52 · {channel}
          </Text>

          {/* High Priority Warning Card */}
          <View style={[styles.warnCard, { backgroundColor: 'rgba(220, 38, 38, 0.08)', borderColor: c.danger }]}>
            <Text style={[styles.warnTitle, { color: c.danger }]}>▲ HIGH PRIORITY</Text>
            <Text style={[styles.warnBody, { color: c.danger }]}>
              Immediate response recommended · Elephants near human settlements
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Conflict Type</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{conflictType}</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Location</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{locationName}</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Reporting Channel</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{channel}</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Report Status</Text>
              <Text style={[styles.gridVal, { color: c.primary }]}>SUBMITTED</Text>
            </View>
            <View style={[styles.gridRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Description</Text>
              <Text style={[styles.gridVal, { color: c.fg, flex: 1, textAlign: 'right' }]}>
                {description}
              </Text>
            </View>
          </View>

          <OfflineMap mode="conflict" />

          <Text style={[styles.fieldLabel, { color: c.fg, marginTop: 8 }]}>Initiate Mitigation Response</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: c.inputBg, borderColor: c.border, color: c.fg }]}
            value={responseNotes}
            onChangeText={setResponseNotes}
            placeholder="Enter response actions..."
            placeholderTextColor={c.muted}
          />

          <Text style={[styles.hintText, { color: c.muted, textAlign: 'center', marginBottom: 12 }]}>
            Reviewing as Ranger / Community Liaison Officer
          </Text>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => setStep('staff_responded')}
          >
            <Text style={styles.primaryBtnText}>Respond to Report</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => setStep(isStaff ? 'staff_desk' : 'overview')}
          >
            <Text style={[styles.secondaryBtnText, { color: c.fg }]}>Back</Text>
          </Pressable>
        </View>
      )}

      {/* 8. RESPONSE RECORDED (FIGURE 18 PANEL 8) */}
      {step === 'staff_responded' && (
        <View style={styles.centeredContainer}>
          <View style={[styles.circleCheck, { backgroundColor: c.success }]}>
            <Text style={styles.circleCheckIcon}>✓</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: 'rgba(46, 125, 80, 0.15)', alignSelf: 'center', marginTop: 12 }]}>
            <Text style={[styles.badgeText, { color: c.success }]}>● RESPONDED</Text>
          </View>

          <Text style={[styles.h1, { color: c.fg, textAlign: 'center', marginTop: 6 }]}>
            Response Recorded
          </Text>
          <Text style={[styles.subHeading, { color: c.muted, textAlign: 'center', marginBottom: 14 }]}>
            Updated 07:10 · Status: RESPONDED
          </Text>

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Responder</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>Ranger / Community Liaison Officer</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Conflict Type</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{conflictType}</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Location</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{locationName}</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Current Status</Text>
              <Text style={[styles.gridVal, { color: c.success }]}>RESPONDED</Text>
            </View>
            <View style={[styles.gridRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Action Initiated</Text>
              <Text style={[styles.gridVal, { color: c.fg, flex: 1, textAlign: 'right' }]}>
                {responseNotes}
              </Text>
            </View>
          </View>

          <OfflineMap mode="conflict" />

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
  subHeading: { fontSize: 13, fontWeight: '700' },
  h1: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  bodyText: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14 },
  categoryItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  catIcon: { fontSize: 28 },
  catTitle: { fontSize: 14, fontWeight: '700' },
  catDesc: { fontSize: 12 },
  divider: { height: 1, marginVertical: 10 },
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
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700' },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  optionTitle: { fontSize: 15, fontWeight: '700' },
  optionSub: { fontSize: 12 },
  miniOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  optionText: { fontSize: 14, fontWeight: '700' },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  fieldLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    marginBottom: 4,
  },
  charCount: { fontSize: 11, textAlign: 'right', marginBottom: 14 },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  gridKey: { fontSize: 13, fontWeight: '600' },
  gridVal: { fontSize: 13, fontWeight: '700' },
  bannerAlert: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, marginBottom: 12 },
  bannerAlertText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  pendingCounterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  bigCounter: { fontSize: 22, fontWeight: '900' },
  centeredContainer: { alignItems: 'stretch' },
  circleCheck: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleCheckIcon: { color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
  headerWithBadge: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaTimeText: { fontSize: 12, fontWeight: '600' },
  warnCard: {
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  warnTitle: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  warnBody: { fontSize: 12, lineHeight: 16 },
});
