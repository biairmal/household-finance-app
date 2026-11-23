import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { formatAmount } from '@/domain/money';
import { Card, PageHeader, Row, Screen, SectionTitle, Txt } from '@/ui/components';
import { ChevronRight } from '@/ui/icons';
import { useAppState, useDbSize, useStore } from '@/ui/StoreProvider';
import { colors } from '@/ui/theme';

// The Plan 1 spikes stay reachable here until Plan 5 replaces them (the Drive spike is still being tested).
const SPIKES = [
  { path: '/spikes/storage', title: 'Storage (SQLite on web)' },
  { path: '/spikes/auth', title: 'Google sign-in' },
  { path: '/spikes/drive', title: 'Drive sharing' },
  { path: '/spikes/calendar', title: 'Calendar reminders' },
] as const;

export default function Developer() {
  const store = useStore();
  const sizeBytes = useDbSize();
  const state = useAppState((s) => s);
  const [info, setInfo] = useState<{ ops: number; bytes: number } | null>(null);

  useEffect(() => {
    Promise.all([store.loadOps(), sizeBytes()]).then(([ops, bytes]) => setInfo({ ops: ops.length, bytes }));
  }, [store, sizeBytes, state]);

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Developer" />
      <Screen>
        <SectionTitle title="Spike screens" />
        <Card style={{ margin: 16, marginTop: 8 }}>
          {SPIKES.map((s, i) => (
            <Row key={s.path} title={s.title} subtitle={s.path} last={i === SPIKES.length - 1} onPress={() => router.push(s.path)} right={<ChevronRight color={colors.muted} size={18} />} />
          ))}
        </Card>
        <SectionTitle title="This device" />
        <Card style={{ margin: 16, marginTop: 8 }}>
          <Row title="Device id" subtitle={store.deviceId} />
          <Row title="Member id" subtitle={store.memberId ?? 'not set'} />
          <Row title="Ops in the log" right={<Txt w="bold" testID="op-count">{info ? formatAmount(info.ops) : '…'}</Txt>} />
          <Row title="Database size" last right={<Txt w="bold">{info ? `${formatAmount(Math.round(info.bytes / 1024))} KB` : '…'}</Txt>} />
        </Card>
      </Screen>
    </View>
  );
}
