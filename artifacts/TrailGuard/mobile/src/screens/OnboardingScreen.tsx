import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import OfflineMap from '../components/OfflineMap';
import { getColors, subscribeTheme, toggleTheme, getTheme } from '../theme';

const SLIDES = [
  {
    stepBadge: 'DEPARTMENT OF WILDLIFE CONSERVATION · SRI LANKA',
    title: 'Smart Wildlife Conservation & Anti-Poaching System',
    subtitle: 'Digital platform for Yala National Park & boundary zones',
    body: 'TrailGuard unites field rangers, park managers, community liaison officers, researchers, and local residents into a resilient, offline-first wildlife protection network.',
    highlights: [
      { tag: 'OFFLINE ARCHITECTURE', desc: 'SQLite persistence on device — zero field data loss' },
      { tag: 'FOUR CORE USE CASES', desc: 'Patrols, field incidents, wildlife alerts & conflict reporting' },
      { tag: 'HIGH-FIDELITY DESIGN', desc: 'Compliant with SE3070 Interaction and Functional Design specification' },
    ],
  },
  {
    stepBadge: 'USE CASE 01 · JOEL NITHUSHAN (IT23556652)',
    title: 'UC01-S01 · Conduct Assigned Ranger Patrol',
    subtitle: 'Ranger Field Execution & Route Coverage',
    body: 'Rangers view assigned patrol routes (e.g., North Boundary Patrol NB-03), track movements via automated GPS or manual waypoints, record offline positions, and calculate patrol route coverage upon completion.',
    highlights: [
      { tag: 'GPS & MANUAL WAYPOINTS', desc: 'Continuous tracking + on-demand manual point marking' },
      { tag: 'STORE LOCALLY & SYNC', desc: 'Full offline queuing with automatic sync when connectivity restores' },
      { tag: 'COVERAGE AUDIT', desc: 'Automated 96% route coverage calculation for Park Manager review' },
    ],
    showMap: true,
    mapType: 'patrol' as const,
  },
  {
    stepBadge: 'USE CASE 02 · THUSHALINI U (IT23794870)',
    title: 'UC02-S01 · Report Field Incident',
    subtitle: 'Anti-Poaching & Wildlife Threat Documentation',
    body: 'Encounter snares, carcasses, illegal campsites, or suspicious footprints during patrol. Capture camera evidence, record GPS coordinates, attach detailed notes, and queue for server synchronisation.',
    highlights: [
      { tag: 'INCIDENT CATEGORIES', desc: 'Snare, Carcass, Illegal Campsite, Footprints, Suspicious Sign' },
      { tag: 'PHOTO & GPS PROOF', desc: 'Validated evidence attachment with precise time and coordinate tags' },
      { tag: 'OFFLINE QUEUED', desc: 'Preserves complete incident report locally if mobile network is lost' },
    ],
    showMap: true,
    mapType: 'incident' as const,
  },
  {
    stepBadge: 'USE CASE 03 · VAISHNAVI L (IT23717336)',
    title: 'UC03-S01 · Tracked Wildlife & Risk Alerts',
    subtitle: 'Automated Geofence & Human-Elephant Early Warning',
    body: 'GPS-collared wildlife (e.g. Elephant EL-07) entering high-risk farmlands or road zones immediately trigger automated alerts to the nearest ranger and community liaison officer to prevent conflict before it occurs.',
    highlights: [
      { tag: 'HIGH-RISK ZONES', desc: 'Geofence risk evaluation for farmland, roads, and village perimeters' },
      { tag: 'LADDER RESPONSE', desc: 'New → Acknowledged → Coordinated Dispatch → Resolved' },
      { tag: 'CAMERA TRAP CORROBORATION', desc: 'Integrates optical sensor feeds and shared field coordination' },
    ],
    showMap: true,
    mapType: 'alert' as const,
  },
  {
    stepBadge: 'USE CASE 04 · KANISTAN T (IT23748644)',
    title: 'UC04-S01 · Human-Wildlife Conflict Reports',
    subtitle: 'Community Reporting & Rapid Liaison Triage',
    body: 'Villagers and farmers living near park borders submit wildlife sightings and crop-raiding incidents via Mobile App or SMS short code. Operations staff review, dispatch liaison rangers, and log mitigations.',
    highlights: [
      { tag: 'DUAL CHANNELS', desc: 'Direct in-app reporting and SMS short-code channel integration' },
      { tag: 'HOTSPOT ANALYSIS', desc: 'Correlates multiple reports to identify emerging conflict trends' },
      { tag: 'HIGH PRIORITY ESCALATION', desc: 'Fast-track response flags for immediate community protection' },
    ],
    showMap: true,
    mapType: 'conflict' as const,
  },
  {
    stepBadge: 'ACTORS & ROLE MATRIX',
    title: 'Role-Based Field Operations',
    subtitle: 'Six designated user personas configured for the field',
    body: 'Choose from six pre-configured actor personas to test every perspective of the wildlife conservation workflow, from field boots to executive operations.',
    highlights: [
      { tag: 'RANGER (RN-402)', desc: 'Conducts patrols, logs incidents, responds to wildlife risk alerts' },
      { tag: 'COMMUNITY LIAISON (liaison)', desc: 'Coordinates community warnings and conflict resolution' },
      { tag: 'PARK MANAGER (manager)', desc: 'Reviews route coverage, assigns patrols, inspects reports' },
      { tag: 'COMMUNITY MEMBER (community)', desc: 'Submits crop raiding and elephant sighting alerts' },
      { tag: 'RESEARCHER (researcher)', desc: 'Analyzes long-term conflict trends and conservation snapshots' },
      { tag: 'SUPER ADMIN (admin)', desc: 'Full system oversight and role permission matrix control' },
    ],
  },
];

type Props = { navigation: { replace: (r: string) => void } };

export default function OnboardingScreen({ navigation }: Props) {
  const [index, setIndex] = useState(0);
  const [, bump] = useState(0);
  useEffect(() => subscribeTheme(() => bump((n) => n + 1)), []);

  const c = getColors();
  const night = getTheme() === 'night';
  const slide = SLIDES[index];

  const goNext = () => {
    if (index < SLIDES.length - 1) {
      setIndex((i) => i + 1);
    } else {
      navigation.replace('Login');
    }
  };

  const skip = () => {
    navigation.replace('Login');
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Top Header Bar */}
      <View style={[styles.topBar, { borderBottomColor: c.border }]}>
        <View style={styles.brandGroup}>
          <Text style={[styles.brandText, { color: c.primary }]}>TrailGuard</Text>
          <Text style={[styles.brandSub, { color: c.muted }]}>DWC · Yala North</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            onPress={toggleTheme}
            style={[styles.themeBtn, { borderColor: c.border, backgroundColor: c.surface }]}
            accessibilityLabel="Toggle Theme"
          >
            <Text style={{ color: c.fg, fontWeight: '700', fontSize: 11 }}>
              {night ? '☀️ Day' : '🌙 Night'}
            </Text>
          </Pressable>
          <Pressable onPress={skip} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: c.muted }]}>Skip</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Step Badge */}
        <View style={[styles.badgeContainer, { backgroundColor: c.elevated, borderColor: c.border }]}>
          <Text style={[styles.badgeText, { color: c.primary }]}>{slide.stepBadge}</Text>
        </View>

        {/* Title & Subtitle */}
        <Text style={[styles.title, { color: c.fg }]}>{slide.title}</Text>
        <Text style={[styles.subtitle, { color: c.secondary }]}>{slide.subtitle}</Text>
        <Text style={[styles.body, { color: c.fg }]}>{slide.body}</Text>

        {/* Optional Visual Map */}
        {slide.showMap ? (
          <View style={styles.mapWrap}>
            <OfflineMap mode={slide.mapType} />
          </View>
        ) : null}

        {/* Highlights */}
        <View style={styles.highlightsContainer}>
          {slide.highlights.map((h, i) => (
            <View
              key={i}
              style={[
                styles.highlightCard,
                { backgroundColor: c.surface, borderColor: c.border },
              ]}
            >
              <View style={styles.highlightHeader}>
                <View style={[styles.dot, { backgroundColor: c.primary }]} />
                <Text style={[styles.highlightTag, { color: c.primary }]}>{h.tag}</Text>
              </View>
              <Text style={[styles.highlightDesc, { color: c.fg }]}>{h.desc}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={[styles.bottomBar, { borderTopColor: c.border, backgroundColor: c.surface }]}>
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <Pressable key={i} onPress={() => setIndex(i)}>
              <View
                style={[
                  styles.dotIndicator,
                  { backgroundColor: c.border },
                  i === index && { width: 22, backgroundColor: c.primary },
                ]}
              />
            </Pressable>
          ))}
        </View>

        <View style={styles.buttonRow}>
          {index > 0 ? (
            <Pressable
              style={[styles.backBtn, { borderColor: c.border }]}
              onPress={() => setIndex((i) => i - 1)}
            >
              <Text style={[styles.backBtnText, { color: c.muted }]}>Back</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[
              styles.primaryBtn,
              { backgroundColor: c.primary },
              index === 0 && { flex: 1 },
            ]}
            onPress={goNext}
          >
            <Text style={[styles.primaryBtnText, { color: c.accentFg }]}>
              {index === SLIDES.length - 1 ? 'Get Started & Sign In' : 'Next Step →'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  brandGroup: { flex: 1 },
  brandText: { fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },
  brandSub: { fontSize: 11, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  themeBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  skipBtn: { paddingVertical: 6, paddingHorizontal: 8 },
  skipText: { fontSize: 13, fontWeight: '600' },
  scrollContent: { padding: 18, paddingBottom: 24 },
  badgeContainer: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 10,
  },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  title: { fontSize: 22, fontWeight: '800', lineHeight: 28, marginBottom: 4 },
  subtitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  body: { fontSize: 14, lineHeight: 21, marginBottom: 16 },
  mapWrap: { marginBottom: 16 },
  highlightsContainer: { gap: 10, marginBottom: 16 },
  highlightCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  highlightHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  highlightTag: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  highlightDesc: { fontSize: 13, lineHeight: 18 },
  bottomBar: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopWidth: 1,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 14,
  },
  dotIndicator: { width: 7, height: 7, borderRadius: 3.5 },
  buttonRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  backBtn: {
    height: 50,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: { fontSize: 14, fontWeight: '600' },
  primaryBtn: {
    flex: 1,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700' },
});
