import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getSession } from '../session';
import { getColors, subscribeTheme } from '../theme';

/** Manager-facing conflict board — pairs with backend /conflict/* */
export default function ConflictScreen({
  navigation,
}: {
  navigation: { replace: (r: string) => void };
}) {
  const session = getSession();
  const [, bump] = useState(0);
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

  return (
    <View style={[styles.wrap, { backgroundColor: c.bg }]}>
      <Text style={[styles.h, { color: c.fg }]}>Conflict response</Text>
      <Text style={[styles.meta, { color: c.muted }]}>
        Collar ingest, risk assessment, assign officer, and acknowledge run through the API
        (Sensor Gateway → ConflictService → Notification). Use /docs on the server to try
        /conflict/ingest, /assign, /acknowledge.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20 },
  h: { fontSize: 18, fontWeight: '700' },
  meta: { marginTop: 12, lineHeight: 22 },
});
