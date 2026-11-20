import { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import { completeWebSignIn, emailOf, getSession, type Session, signIn, signOut } from '@/spike/google';

// Spike: Google sign-in (redirect) + refresh via the Worker, on Android and the iPhone home-screen app.
export default function AuthSpike() {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState('checking…');

  const run = async (f: () => Promise<Session | null>) => {
    try {
      const s = await f();
      setSession(s);
      setStatus(s ? `ok at ${new Date().toLocaleTimeString()}` : 'not signed in');
    } catch (e) {
      setStatus(String(e));
    }
  };

  useEffect(() => {
    run(async () => (await completeWebSignIn()) ?? getSession());
  }, []);

  return (
    <View style={styles.root}>
      <Text style={styles.big}>{session ? `Signed in: ${emailOf(session.idToken) ?? '?'}` : 'Signed out'}</Text>
      {session && (
        <Text>
          Via: {session.via} · token expires {new Date(session.expiresAt).toLocaleTimeString()}
        </Text>
      )}
      <Text>Status: {status}</Text>
      <Button title="Sign in with Google" onPress={() => run(() => signIn())} color="#0A9F5A" />
      <Button title="Refresh now" onPress={() => run(() => getSession(true))} color="#0A9F5A" />
      <Button
        title="Sign out"
        onPress={() =>
          run(async () => {
            await signOut();
            return null;
          })
        }
        color="#888"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, gap: 12 },
  big: { fontSize: 20, fontWeight: '600' },
});
