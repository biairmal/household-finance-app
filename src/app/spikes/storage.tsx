import * as Crypto from 'expo-crypto'; // Hermes (Android) has no global crypto
import * as SQLite from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Button, Platform, StyleSheet, Text, View } from 'react-native';

// Spike: does expo-sqlite (wasm/OPFS on web) keep rows in the iPhone home-screen app?
const dbPromise = SQLite.openDatabaseAsync('spike-storage.db').then(async (db) => {
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS rows (id TEXT PRIMARY KEY NOT NULL, text TEXT NOT NULL, createdAt TEXT NOT NULL);',
  );
  return db;
});

export default function StorageSpike() {
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [persisted, setPersisted] = useState<string>('n/a');

  const refresh = async () => {
    try {
      const db = await dbPromise;
      const r = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM rows');
      setCount(r?.n ?? 0);
    } catch (e) {
      setError(String(e));
    }
  };

  const add100 = async () => {
    try {
      const db = await dbPromise;
      await db.withTransactionAsync(async () => {
        for (let i = 0; i < 100; i++) {
          const now = new Date().toISOString();
          await db.runAsync('INSERT INTO rows (id, text, createdAt) VALUES (?, ?, ?)', Crypto.randomUUID(), `row ${i}`, now);
        }
      });
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    refresh();
    // Ask the browser not to evict our storage; the answer goes in spike-results.md.
    if (Platform.OS === 'web' && navigator.storage?.persist) {
      navigator.storage.persist().then((ok) => setPersisted(ok ? 'granted' : 'denied'));
    }
  }, []);

  return (
    <View style={styles.root}>
      <Text style={styles.count}>Count: {count ?? '…'}</Text>
      <Text>Platform: {Platform.OS}, persist(): {persisted}</Text>
      <Text>crossOriginIsolated: {Platform.OS === 'web' ? String(globalThis.crossOriginIsolated) : 'n/a'}</Text>
      <Button title="Add 100" onPress={add100} color="#0A9F5A" />
      <Button title="Count" onPress={refresh} color="#0A9F5A" />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, gap: 12 },
  count: { fontSize: 28, fontWeight: '600' },
  error: { color: '#c00' },
});
