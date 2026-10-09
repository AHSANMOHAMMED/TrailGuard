import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput } from 'react-native';
import OfflineMap from '../components/OfflineMap';
import { createIncident } from '../services/incidentService';
import { getSession } from '../session';
import { getColors, subscribeTheme } from '../theme';

type IncidentStep =
  | 'overview'
  | 'type_select'
  | 'photo_capture'
  | 'details_input'
  | 'review'
  | 'validation'
  | 'offline_stored'
  | 'submitted';

const INCIDENT_CATEGORIES = [
  'Snare',
  'Carcass',
  'Illegal Campsite',
  'Footprints',
  'Other',
];

export default function IncidentScreen({
  navigation,
}: {
  navigation: { replace: (r: string) => void; navigate: (r: string) => void };
}) {
  const session = getSession();
  const [, bump] = useState(0);
  useEffect(() => subscribeTheme(() => bump((n) => n + 1)), []);
  const c = getColors();

  const [step, setStep] = useState<IncidentStep>('overview');
  const [selectedType, setSelectedType] = useState('Snare');
  const [photoTime, setPhotoTime] = useState('07:14');
  const [lat] = useState('8.4123');
  const [lng] = useState('80.4021');
  const [description, setDescription] = useState('Wire snare found beside animal trail.');

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

  const handleValidateAndSubmit = (simulateOffline = false) => {
    setStep('validation');
    setTimeout(() => {
      // Store in SQLite
      createIncident({
        parkId: 'park-yala',
        type: selectedType,
        description: description.trim(),
        geo: { lat: Number(lat) || 8.4123, lng: Number(lng) || 80.4021 },
        locationSource: 'GPS',
        photoUri: 'file:///data/evidence/photo_0714.jpg',
      });

      if (simulateOffline) {
        setStep('offline_stored');
      } else {
        setStep('submitted');
      }
    }, 900);
  };

  return (
    <ScrollView style={[styles.wrap, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      {/* 1. REPORT FIELD INCIDENT OVERVIEW */}
      {step === 'overview' && (
        <View>
          <Text style={[styles.subHeading, { color: c.muted }]}>Ranger Field Report</Text>
          <Text style={[styles.h1, { color: c.fg }]}>New Field Incident</Text>
          <Text style={[styles.bodyText, { color: c.muted }]}>
            Record an incident encountered during patrol.
          </Text>

          <OfflineMap mode="incident" />

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.cardTitle, { color: c.fg }]}>Examples of field incidents</Text>
            <View style={styles.chipRow}>
              {['Snare', 'Carcass', 'Illegal Campsite', 'Footprints'].map((ex) => (
                <View key={ex} style={[styles.badge, { backgroundColor: c.elevated }]}>
                  <Text style={[styles.badgeText, { color: c.fg }]}>• {ex}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.hintText, { color: c.muted, marginTop: 10 }]}>
              Photo and GPS location are captured in the field.
            </Text>
          </View>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => setStep('type_select')}
          >
            <Text style={styles.primaryBtnText}>Start Report</Text>
          </Pressable>
        </View>
      )}

      {/* 2. INCIDENT TYPE */}
      {step === 'type_select' && (
        <View>
          <Text style={[styles.subHeading, { color: c.muted }]}>Step 1 of 4</Text>
          <Text style={[styles.h1, { color: c.fg }]}>What did you find?</Text>
          <Text style={[styles.bodyText, { color: c.muted }]}>Choose the closest category.</Text>

          {INCIDENT_CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[
                styles.optionRow,
                {
                  backgroundColor: selectedType === cat ? c.elevated : c.surface,
                  borderColor: selectedType === cat ? c.primary : c.border,
                },
              ]}
              onPress={() => setSelectedType(cat)}
            >
              <View
                style={[
                  styles.radioOuter,
                  { borderColor: selectedType === cat ? c.primary : c.border },
                ]}
              >
                {selectedType === cat && (
                  <View style={[styles.radioInner, { backgroundColor: c.primary }]} />
                )}
              </View>
              <Text style={[styles.optionText, { color: c.fg }]}>{cat}</Text>
            </Pressable>
          ))}

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary, marginTop: 12 }]}
            onPress={() => setStep('photo_capture')}
          >
            <Text style={styles.primaryBtnText}>Continue →</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => setStep('overview')}
          >
            <Text style={[styles.secondaryBtnText, { color: c.fg }]}>Cancel</Text>
          </Pressable>
        </View>
      )}

      {/* 3. CAPTURE PHOTOGRAPH */}
      {step === 'photo_capture' && (
        <View>
          <Text style={[styles.subHeading, { color: c.muted }]}>Step 2 of 4</Text>
          <Text style={[styles.h1, { color: c.fg }]}>Incident Photo</Text>

          {/* Camera Frame View */}
          <View style={[styles.photoFrame, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[styles.photoPlaceholder, { backgroundColor: c.elevated }]}>
              <Text style={styles.photoIcon}>📷</Text>
              <Text style={[styles.photoTimestampBadge, { color: c.fg, backgroundColor: c.surface }]}>
                {photoTime} · attached
              </Text>
            </View>
          </View>

          <View style={[styles.badge, { backgroundColor: 'rgba(46, 125, 80, 0.15)', alignSelf: 'center', marginVertical: 12 }]}>
            <Text style={[styles.badgeText, { color: c.success }]}>✓ Photo Captured</Text>
          </View>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => setStep('details_input')}
          >
            <Text style={styles.primaryBtnText}>Continue →</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => {
              setPhotoTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
            }}
          >
            <Text style={[styles.secondaryBtnText, { color: c.fg }]}>Retake Photo</Text>
          </Pressable>
        </View>
      )}

      {/* 4. INCIDENT DETAILS */}
      {step === 'details_input' && (
        <View>
          <Text style={[styles.subHeading, { color: c.muted }]}>Step 3 of 4</Text>
          <Text style={[styles.h1, { color: c.fg }]}>Incident Details</Text>

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.cardTitle, { color: c.fg }]}>GPS Location</Text>
              <View style={[styles.badge, { backgroundColor: 'rgba(46, 125, 80, 0.15)' }]}>
                <Text style={[styles.badgeText, { color: c.success }]}>● CAPTURED</Text>
              </View>
            </View>
            <OfflineMap mode="incident" />
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Latitude</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{lat}° N</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Longitude</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{lng}° E</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Capture Time</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{photoTime}</Text>
            </View>
          </View>

          <Text style={[styles.inputLabel, { color: c.fg }]}>Short Description</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: c.inputBg, borderColor: c.border, color: c.fg }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe what was found..."
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
            onPress={() => setStep('photo_capture')}
          >
            <Text style={[styles.secondaryBtnText, { color: c.fg }]}>Back</Text>
          </Pressable>
        </View>
      )}

      {/* 5. REVIEW INCIDENT */}
      {step === 'review' && (
        <View>
          <Text style={[styles.subHeading, { color: c.muted }]}>Step 4 of 4</Text>
          <Text style={[styles.h1, { color: c.fg }]}>Review Incident</Text>
          <Text style={[styles.bodyText, { color: c.muted }]}>Check the details before submitting.</Text>

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={[styles.thumbnailRow, { backgroundColor: c.elevated, borderColor: c.border }]}>
              <Text style={styles.thumbIcon}>📷</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.thumbTitle, { color: c.fg }]}>Photograph Attached</Text>
                <Text style={[styles.thumbMeta, { color: c.muted }]}>{photoTime} · Evidence captured</Text>
              </View>
            </View>

            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Incident Type</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{selectedType}</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>GPS Location</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{lat}° N, {lng}° E</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Captured</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{photoTime}</Text>
            </View>
            <View style={[styles.gridRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Description</Text>
              <Text style={[styles.gridVal, { color: c.fg, flex: 1, textAlign: 'right' }]}>
                {description}
              </Text>
            </View>
          </View>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => handleValidateAndSubmit(false)}
          >
            <Text style={styles.primaryBtnText}>Submit Incident</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryBtn, { backgroundColor: c.surface, borderColor: c.warn }]}
            onPress={() => handleValidateAndSubmit(true)}
          >
            <Text style={[styles.secondaryBtnText, { color: c.warn }]}>Simulate Offline Submission (A1)</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => setStep('details_input')}
          >
            <Text style={[styles.secondaryBtnText, { color: c.fg }]}>Edit Details</Text>
          </Pressable>
        </View>
      )}

      {/* 6. VALIDATING INCIDENT */}
      {step === 'validation' && (
        <View style={styles.validationBox}>
          <Text style={[styles.h1, { color: c.fg, textAlign: 'center' }]}>Validating required information...</Text>
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, marginTop: 16 }]}>
            <View style={styles.checkItem}>
              <Text style={[styles.checkMark, { color: c.success }]}>✓</Text>
              <Text style={[styles.checkText, { color: c.fg }]}>Incident type</Text>
              <Text style={[styles.checkStatus, { color: c.muted }]}>present</Text>
            </View>
            <View style={styles.checkItem}>
              <Text style={[styles.checkMark, { color: c.success }]}>✓</Text>
              <Text style={[styles.checkText, { color: c.fg }]}>Photograph</Text>
              <Text style={[styles.checkStatus, { color: c.muted }]}>present</Text>
            </View>
            <View style={styles.checkItem}>
              <Text style={[styles.checkMark, { color: c.success }]}>✓</Text>
              <Text style={[styles.checkText, { color: c.fg }]}>GPS location</Text>
              <Text style={[styles.checkStatus, { color: c.muted }]}>present</Text>
            </View>
            <View style={styles.checkItem}>
              <Text style={[styles.checkMark, { color: c.success }]}>✓</Text>
              <Text style={[styles.checkText, { color: c.fg }]}>Description</Text>
              <Text style={[styles.checkStatus, { color: c.muted }]}>present</Text>
            </View>
          </View>
          <Text style={[styles.subHeading, { color: c.primary, textAlign: 'center', marginTop: 14 }]}>
            Submitting incident...
          </Text>
        </View>
      )}

      {/* 7. OFFLINE INCIDENT - CONDITIONAL (A1) */}
      {step === 'offline_stored' && (
        <View>
          <View style={[styles.bannerAlert, { backgroundColor: c.warn }]}>
            <Text style={styles.bannerAlertText}>⚠️ OFFLINE · Incident Stored Locally</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: 'rgba(217, 119, 6, 0.15)', alignSelf: 'center', marginBottom: 12 }]}>
            <Text style={[styles.badgeText, { color: c.warn }]}>● PENDING SYNCHRONISATION</Text>
          </View>

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.cardTitle, { color: c.fg }]}>{selectedType}</Text>
            <Text style={[styles.metaTimeText, { color: c.muted }]}>{lat}° N, {lng}° E</Text>
            <Text style={[styles.bodyText, { color: c.fg, marginTop: 6 }]}>{description}</Text>

            <View style={styles.pendingCounterRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Pending Synchronisation</Text>
              <Text style={[styles.bigCounter, { color: c.warn }]}>1</Text>
            </View>
            <Text style={[styles.hintText, { color: c.muted }]}>
              Will synchronize automatically when connectivity returns.
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

      {/* 8. INCIDENT SUBMITTED */}
      {step === 'submitted' && (
        <View style={styles.submittedContainer}>
          <View style={[styles.circleCheck, { backgroundColor: c.success }]}>
            <Text style={styles.circleCheckIcon}>✓</Text>
          </View>

          <View style={[styles.badge, { backgroundColor: 'rgba(46, 125, 80, 0.15)', alignSelf: 'center', marginTop: 12 }]}>
            <Text style={[styles.badgeText, { color: c.success }]}>● SUBMITTED</Text>
          </View>

          <Text style={[styles.h1, { color: c.fg, textAlign: 'center', marginTop: 8 }]}>
            Incident Submitted Successfully
          </Text>
          <Text style={[styles.subHeading, { color: c.muted, textAlign: 'center', marginBottom: 14 }]}>
            Linked to your active patrol · Route NB-03
          </Text>

          <OfflineMap mode="incident" />

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Incident Type</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{selectedType}</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>GPS Location</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{lat}° N, {lng}° E</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Captured</Text>
              <Text style={[styles.gridVal, { color: c.fg }]}>{photoTime}</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Photo</Text>
              <Text style={[styles.gridVal, { color: c.success }]}>attached</Text>
            </View>
            <View style={styles.gridRow}>
              <Text style={[styles.gridKey, { color: c.muted }]}>Submission Status</Text>
              <Text style={[styles.gridVal, { color: c.success }]}>SUBMITTED</Text>
            </View>
          </View>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => navigation.navigate('Patrol')}
          >
            <Text style={styles.primaryBtnText}>Continue Patrol</Text>
          </Pressable>

          <Pressable
            style={[styles.secondaryBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={[styles.secondaryBtnText, { color: c.fg }]}>Back to Field Hub</Text>
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
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '800' },
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
  optionText: { fontSize: 14, fontWeight: '700' },
  photoFrame: { borderWidth: 1, borderRadius: 12, overflow: 'hidden', padding: 8, marginBottom: 8 },
  photoPlaceholder: {
    height: 160,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  photoIcon: { fontSize: 44 },
  photoTimestampBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  gridKey: { fontSize: 13, fontWeight: '600' },
  gridVal: { fontSize: 13, fontWeight: '700' },
  inputLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    marginBottom: 4,
  },
  charCount: { fontSize: 11, textAlign: 'right', marginBottom: 14 },
  thumbnailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    gap: 10,
  },
  thumbIcon: { fontSize: 24 },
  thumbTitle: { fontSize: 13, fontWeight: '700' },
  thumbMeta: { fontSize: 11 },
  validationBox: { paddingVertical: 20 },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  checkMark: { fontSize: 16, fontWeight: '900' },
  checkText: { fontSize: 13, fontWeight: '700', flex: 1 },
  checkStatus: { fontSize: 12 },
  bannerAlert: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, marginBottom: 12 },
  bannerAlertText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  metaTimeText: { fontSize: 12, fontWeight: '600' },
  pendingCounterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  bigCounter: { fontSize: 22, fontWeight: '900' },
  submittedContainer: { alignItems: 'stretch' },
  circleCheck: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleCheckIcon: { color: '#FFFFFF', fontSize: 32, fontWeight: '900' },
});
