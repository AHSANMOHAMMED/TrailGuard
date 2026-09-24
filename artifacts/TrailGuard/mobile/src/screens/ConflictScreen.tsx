import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/** Manager-facing conflict board — pairs with backend /conflict/* */
export default function ConflictScreen() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.h}>Conflict response</Text>
      <Text style={styles.meta}>
        Collar ingest, risk assessment, assign officer, and acknowledge run through the API
        (Sensor Gateway → ConflictService → Notification). Use /docs on the server to try
        /conflict/ingest, /assign, /acknowledge.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: '#0A100C' },
  h: { color: '#fff', fontSize: 18, fontWeight: '700' },
  meta: { color: '#8A9E8E', marginTop: 12, lineHeight: 22 },
});
