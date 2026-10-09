import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { getSession } from '../session';
import { getColors, subscribeTheme } from '../theme';

type ChannelId = 'OPS-1' | 'EMG-7' | 'CMN-3';

const ALL_CHANNELS: { id: ChannelId; label: string; hint: string }[] = [
  { id: 'OPS-1', label: 'OPS-1', hint: 'Park operations' },
  { id: 'EMG-7', label: 'EMG-7', hint: 'Emergency' },
  { id: 'CMN-3', label: 'CMN-3', hint: 'Community' },
];

function channelsFor(role: string | undefined): ChannelId[] {
  if (role === 'COMMUNITY') return ['CMN-3'];
  return ['OPS-1', 'EMG-7', 'CMN-3'];
}

function defaultChannel(role: string | undefined): ChannelId {
  if (role === 'COMMUNITY' || role === 'LIAISON') return 'CMN-3';
  if (role === 'MANAGER' || role === 'RANGER') return 'OPS-1';
  return 'CMN-3';
}

type LogItem = { id: string; from: string; text: string; at: string; pending?: boolean };

export default function RadioScreen({
  navigation,
}: {
  navigation: { replace: (r: string) => void; navigate: (r: string) => void };
}) {
  const session = getSession();
  const [, bump] = useState(0);
  useEffect(() => subscribeTheme(() => bump((n) => n + 1)), []);
  const c = getColors();

  const allowed = useMemo(() => channelsFor(session?.role), [session?.role]);
  const [channel, setChannel] = useState<ChannelId>(() => defaultChannel(getSession()?.role));
  const [text, setText] = useState('');
  const [pttHeld, setPttHeld] = useState(false);
  const [online] = useState(true);
  const [log, setLog] = useState<LogItem[]>([
    {
      id: '1',
      from: 'OPS Desk',
      text: 'Net open on OPS-1. Report boundary contacts.',
      at: '06:40',
    },
    {
      id: '2',
      from: 'Liaison Fernando',
      text: 'CMN-3 clear — village watch standing by.',
      at: '06:48',
    },
  ]);

  useEffect(() => {
    if (!session) {
      navigation.replace('Login');
      return;
    }
    if (!session.access.includes('radio')) {
      navigation.replace('Home');
      return;
    }
    if (!allowed.includes(channel)) {
      setChannel(defaultChannel(session.role));
    }
  }, [session, navigation, allowed, channel]);

  if (!session || !session.access.includes('radio')) return null;

  const fromTitle = session.title;
  const channelMeta = ALL_CHANNELS.find((ch) => ch.id === channel)!;
  const filtered = log.filter((m) => true); // single shared demo log

  const transmit = (msg: string, pending = false) => {
    const item: LogItem = {
      id: String(Date.now()),
      from: fromTitle,
      text: msg,
      at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      pending,
    };
    setLog((prev) => [item, ...prev]);
    setText('');
  };

  return (
    <ScrollView style={[styles.wrap, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.sub, { color: c.muted }]}>Field Radio · VHF plan</Text>
      <Text style={[styles.h1, { color: c.fg }]}>Push-to-talk</Text>
      <Text style={[styles.body, { color: c.muted }]}>
        {fromTitle} · {session.role}
        {!online ? ' · OFFLINE (queues locally)' : ''}
      </Text>

      <Text style={[styles.label, { color: c.fg }]}>Channel</Text>
      <View style={styles.chanRow}>
        {ALL_CHANNELS.filter((ch) => allowed.includes(ch.id)).map((ch) => {
          const on = channel === ch.id;
          return (
            <Pressable
              key={ch.id}
              style={[
                styles.chanChip,
                {
                  backgroundColor: on ? c.primary : c.surface,
                  borderColor: on ? c.primary : c.border,
                },
              ]}
              onPress={() => setChannel(ch.id)}
            >
              <Text style={{ color: on ? '#fff' : c.fg, fontWeight: '800', fontSize: 12 }}>
                {ch.label}
              </Text>
              <Text style={{ color: on ? 'rgba(255,255,255,0.8)' : c.muted, fontSize: 10 }}>
                {ch.hint}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={[styles.label, { color: c.muted }]}>
          On air · {channelMeta.label}
        </Text>
        {filtered.slice(0, 8).map((m) => (
          <View key={m.id} style={[styles.logRow, { borderBottomColor: c.border }]}>
            <Text style={{ color: c.primary, fontWeight: '800', fontSize: 12 }}>
              {m.from}
              {m.pending ? ' · PENDING' : ''}
            </Text>
            <Text style={{ color: c.fg, fontSize: 13, marginTop: 2 }}>{m.text}</Text>
            <Text style={{ color: c.muted, fontSize: 10, marginTop: 2 }}>{m.at}</Text>
          </View>
        ))}
      </View>

      <TextInput
        style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.border, color: c.fg }]}
        value={text}
        onChangeText={setText}
        placeholder="Text transmission…"
        placeholderTextColor={c.muted}
      />
      <Pressable
        style={[styles.primaryBtn, { backgroundColor: c.primary }]}
        onPress={() => {
          if (!text.trim()) {
            Alert.alert('Radio', 'Enter a short message or use PTT.');
            return;
          }
          transmit(text.trim(), !online);
        }}
      >
        <Text style={styles.primaryBtnText}>Send text on {channel}</Text>
      </Pressable>

      <Pressable
        style={[
          styles.ptt,
          {
            backgroundColor: pttHeld ? '#B91C1C' : c.primary,
            borderColor: pttHeld ? '#7F1D1D' : c.primary,
          },
        ]}
        onPressIn={() => setPttHeld(true)}
        onPressOut={() => {
          setPttHeld(false);
          transmit(`[VOICE] ${fromTitle} on ${channel}`, !online);
        }}
      >
        <Text style={styles.pttText}>{pttHeld ? 'TRANSMITTING…' : 'HOLD TO TALK (PTT)'}</Text>
      </Pressable>

      <Text style={[styles.hint, { color: c.muted }]}>
        Community members are limited to CMN-3. Staff may use OPS / EMG / CMN. Offline calls stay
        PENDING until sync.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { padding: 18, paddingBottom: 40 },
  sub: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  h1: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  body: { fontSize: 13, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '800', marginBottom: 8 },
  chanRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chanChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 88,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    maxHeight: 280,
  },
  logRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    marginBottom: 10,
  },
  primaryBtn: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  ptt: {
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  pttText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
  hint: { fontSize: 11, lineHeight: 16, marginTop: 10 },
});
