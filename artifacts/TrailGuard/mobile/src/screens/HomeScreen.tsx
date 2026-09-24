import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { initLocalStore } from '../store/localStore';

export default function HomeScreen({ navigation }: any) {
  useEffect(() => {
    initLocalStore();
  }, []);

  const Item = ({ title, route }: { title: string; route: string }) => (
    <Pressable style={styles.card} onPress={() => navigation.navigate(route)}>
      <Text style={styles.cardText}>{title}</Text>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.brand}>TrailGuard</Text>
      <Text style={styles.sub}>Offline-first field operations</Text>
      <Item title="UC01 · Patrol" route="Patrol" />
      <Item title="UC02 · Incident" route="Incident" />
      <Item title="UC03 · Conflict" route="Conflict" />
      <Item title="UC04 · Reports" route="Reports" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, backgroundColor: '#0A100C' },
  brand: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: 12 },
  sub: { color: '#8A9E8E', marginBottom: 24 },
  card: {
    backgroundColor: '#141E18',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2E5038',
  },
  cardText: { color: '#E6F0E6', fontSize: 16, fontWeight: '600' },
});
