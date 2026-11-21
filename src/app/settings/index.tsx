import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { todayJakarta } from '@/domain/dates';
import { accounts, categories, recentlyDeleted } from '@/store/selectors';
import { backUpNow } from '@/store/backup';
import { Card, IconCircle, PageHeader, Row, Screen, Txt } from '@/ui/components';
import { notify } from '@/ui/confirm';
import { ChevronRight } from '@/ui/icons';
import { useAppState, useStore } from '@/ui/StoreProvider';
import { colors } from '@/ui/theme';

const chevron = <ChevronRight color={colors.muted} size={18} />;
const count = (n: number) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <Txt size={13} color={colors.muted}>{n}</Txt>
    {chevron}
  </View>
);
const Section = ({ title }: { title: string }) => (
  <Txt size={12} w="bold" color={colors.muted} accessibilityRole="header" style={{ paddingHorizontal: 4, paddingTop: 8 }}>{title}</Txt>
);

export default function Settings() {
  const store = useStore();
  const today = todayJakarta();
  const n = useAppState((s) => ({ accounts: accounts(s).length, categories: categories(s).length, deleted: recentlyDeleted(s, today).length }));
  const [busy, setBusy] = useState(false);

  const backUp = async () => {
    setBusy(true);
    try {
      await backUpNow(store);
    } catch (e) {
      notify('Backup failed', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Settings" />
      <Screen style={{ padding: 16, gap: 8 }}>
        <Section title="Money" />
        <Card>
          <Row left={<IconCircle emoji="🏦" tint="blue" size={38} />} title="Accounts & pockets" onPress={() => router.push('/settings/accounts')} right={count(n.accounts)} />
          <Row left={<IconCircle emoji="🗂️" tint="green" size={38} />} title="Categories" onPress={() => router.push('/settings/categories')} right={count(n.categories)} />
          <Row left={<IconCircle emoji="🎯" tint="yellow" size={38} />} title="Budget setup" last onPress={() => router.push('/settings/budgets')} right={chevron} />
        </Card>
        <Section title="Data" />
        <Card>
          <Row left={<IconCircle emoji="🗑️" tint="red" size={38} />} title="Recently deleted" onPress={() => router.push('/settings/deleted')} right={count(n.deleted)} />
          <Row
            left={<IconCircle emoji="📦" tint="green" size={38} />}
            title={busy ? 'Backing up…' : 'Back up now'}
            subtitle="Save a copy of everything as a file"
            onPress={busy ? undefined : backUp}
            label="Back up now"
          />
          <Row left={<IconCircle emoji="🛠️" tint="blue" size={38} />} title="Developer" last onPress={() => router.push('/settings/developer')} right={chevron} />
        </Card>
      </Screen>
    </View>
  );
}
