import { useEffect, useState } from 'react';
import { Button, Platform, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { createFolder, readAllOps, shareWith, writeNextOpsFile } from '@/spike/drive';
import { getSession } from '@/spike/google';
import { getPref, setPref } from '@/spike/prefs';

const PICKER_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY ?? '';
const PICKER_APP_ID = process.env.EXPO_PUBLIC_GOOGLE_APP_ID ?? '';

// Spike (spec §10.1): can a second member read and append in the owner's folder under drive.file,
// including files the owner creates AFTER the member picked the folder?
export default function DriveSpike() {
  const [householdId, setHouseholdId] = useState('');
  const [device, setDevice] = useState(Platform.OS === 'web' ? 'wife-phone' : 'bia-phone');
  const [email, setEmail] = useState('');
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    getPref('spike.householdId').then((id) => id && setHouseholdId(id));
  }, []);

  const say = (...lines: string[]) => setLog((l) => [...lines, ...l]);
  const run = (label: string, f: () => Promise<string | string[]>) => async () => {
    try {
      const r = await f();
      say(...(Array.isArray(r) ? r : [r]).map((x) => `${label}: ${x}`));
    } catch (e) {
      say(`${label}: FAILED ${e}`);
    }
  };
  const saveId = (id: string) => {
    setHouseholdId(id);
    setPref('spike.householdId', id);
  };

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <Text style={styles.label}>Household folder id</Text>
      <TextInput style={styles.input} value={householdId} onChangeText={saveId} autoCapitalize="none" />
      <Text style={styles.label}>This device's ops folder</Text>
      <TextInput style={styles.input} value={device} onChangeText={setDevice} autoCapitalize="none" />

      <Text style={styles.h}>Owner (Bia)</Text>
      <Button
        title="Create 'Household Money (spike)'"
        color="#0A9F5A"
        onPress={run('create', async () => {
          const id = await createFolder('Household Money (spike)');
          saveId(id);
          return `folder ${id}`;
        })}
      />
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Member's Google email" autoCapitalize="none" keyboardType="email-address" />
      <Button title="Share folder (writer)" color="#0A9F5A" onPress={run('share', async () => (await shareWith(householdId, email), `shared with ${email}`))} />

      <Text style={styles.h}>Member (wife, web)</Text>
      {Platform.OS === 'web' && (
        // Full navigation on purpose: public/picker.html is served without cross-origin isolation.
        <Button
          title="Pick folder with Google Picker"
          color="#0A9F5A"
          onPress={run('picker', async () => {
            const s = await getSession();
            if (!s) throw new Error('sign in first on the auth spike');
            const p = new URLSearchParams({ token: s.accessToken, key: PICKER_KEY, appId: PICKER_APP_ID });
            location.assign(`/picker#${p}`);
            return 'opening';
          })}
        />
      )}

      <Text style={styles.h}>Both</Text>
      <Button title="Write next ops file" color="#0A9F5A" onPress={run('write', () => writeNextOpsFile(householdId, device))} />
      <Button title="List + read all ops files" color="#0A9F5A" onPress={run('read', () => readAllOps(householdId))} />

      {log.map((l, i) => (
        <Text key={i} style={l.includes('FAILED') || l.includes('ERROR') ? styles.err : undefined}>
          {l}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 24, gap: 10 },
  h: { fontSize: 18, fontWeight: '600', marginTop: 12 },
  label: { color: '#555' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8 },
  err: { color: '#c00' },
});
