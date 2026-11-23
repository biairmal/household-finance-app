import { useState } from 'react';
import { Button, ScrollView, StyleSheet, Text } from 'react-native';
import { google, signIn } from '@/spike/google';

// Spike: bill reminders as Google Calendar events with popup alerts, under calendar.app.created
// (own secondary calendar), falling back to calendar.events on the primary calendar.
const API = 'https://www.googleapis.com/calendar/v3';

/** YYYY-MM-DD in Asia/Jakarta, offset by whole days. */
const jakartaDate = (offsetDays: number) => {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

async function post(path: string, body: object) {
  const res = await google(`${API}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

// All-day event tomorrow: 1440 min before = today 00:00, 60 min before = today 23:00 (the one to watch fire).
const createDueEvent = (calendarId: string) =>
  post(`/calendars/${encodeURIComponent(calendarId)}/events`, {
    summary: 'Vehicle tax due',
    start: { date: jakartaDate(1) },
    end: { date: jakartaDate(2) },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 1440 },
        { method: 'popup', minutes: 60 },
      ],
    },
  });

export default function CalendarSpike() {
  const [log, setLog] = useState<string[]>([]);
  const run = (label: string, f: () => Promise<string>) => async () => {
    try {
      setLog((l) => [`${label}: …`, ...l]);
      const r = await f();
      setLog((l) => [`${label}: ${r}`, ...l]);
    } catch (e) {
      setLog((l) => [`${label}: FAILED ${e}`, ...l]);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <Button
        title="Create calendar + 'Vehicle tax due' tomorrow"
        color="#0A9F5A"
        onPress={run('calendar.app.created', async () => {
          const cal = await post('/calendars', { summary: 'Household bills (spike)', timeZone: 'Asia/Jakarta' });
          const ev = await createDueEvent(cal.id);
          return `calendar ${cal.id}, event ${ev.htmlLink}`;
        })}
      />
      <Text style={styles.h}>Fallback (only if the above is rejected)</Text>
      <Button
        title="Sign in again with calendar.events"
        color="#888"
        onPress={run('re-consent', async () => ((await signIn(['https://www.googleapis.com/auth/calendar.events'])) ? 'ok' : 'redirecting'))}
      />
      <Button
        title="Create event on primary calendar"
        color="#888"
        onPress={run('calendar.events', async () => `event ${(await createDueEvent('primary')).htmlLink}`)}
      />
      {log.map((l, i) => (
        <Text key={i} style={l.includes('FAILED') ? styles.err : undefined}>
          {l}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: 24, gap: 12 },
  h: { fontSize: 16, fontWeight: '600', marginTop: 12 },
  err: { color: '#c00' },
});
