import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

const spikes = ['storage', 'auth', 'drive', 'calendar'] as const;

export default function Home() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Household Money</Text>
      <Text>Spike build</Text>
      {spikes.map((s) => (
        <Link key={s} href={`/spikes/${s}`} style={styles.link}>
          {s}
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '600', color: '#0A9F5A' },
  link: { fontSize: 18, paddingVertical: 8, color: '#0A9F5A' },
});
