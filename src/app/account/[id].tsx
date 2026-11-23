import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { addMonthsToKey, monthOf, todayJakarta } from '@/domain/dates';
import { formatIDR } from '@/domain/money';
import { ACCOUNT_TYPES, accountRows, dayGroups, last4, pockets } from '@/store/selectors';
import { Button, Card, Field, IconCircle, Money, MonthStepper, PageHeader, Row, Screen, SectionTitle, Txt, monthName } from '@/ui/components';
import { useAppState, useStore } from '@/ui/StoreProvider';
import { colors } from '@/ui/theme';
import { DayCard } from '@/ui/TxRows';

export default function AccountDetail() {
  const store = useStore();
  const { id } = useLocalSearchParams<{ id: string }>();
  const today = todayJakarta();
  const [month, setMonth] = useState(monthOf(today));
  const [newPocket, setNewPocket] = useState<string | null>(null);
  const row = useAppState((s) => accountRows(s).rows.find((r) => r.account.id === id));
  const names = useAppState((s) => Object.fromEntries(pockets(s).map((p) => [p.id, p.name])));
  const groups = useAppState((s) => dayGroups(s, month, undefined, id));

  if (!row) {
    return (
      <View style={{ flex: 1 }}>
        <PageHeader title="Account" />
        <Txt color={colors.muted} style={{ padding: 16 }}>This account was deleted. You can restore it from Settings → Recently deleted.</Txt>
      </View>
    );
  }
  const { account, balance, free, overAllocatedBy } = row;
  const t = ACCOUNT_TYPES[account.type];
  const credit = account.type === 'credit';

  const addPocket = async () => {
    if (!newPocket?.trim()) return;
    await store.create('pocket', { accountId: account.id, name: newPocket.trim() });
    setNewPocket(null);
  };

  return (
    <View style={{ flex: 1 }}>
      <PageHeader
        title={account.name}
        right={<Button title="Edit" kind="ghost" small onPress={() => router.push({ pathname: '/account/edit', params: { id: account.id } })} />}
      />
      <Screen style={{ padding: 16, gap: 12 }}>
        <Card style={{ paddingVertical: 16, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <IconCircle emoji={t.emoji} tint={t.tint} size={36} />
            <Txt color={colors.muted}>{[t.label, account.institution, last4(account.accountNumber)].filter(Boolean).join(' · ')}</Txt>
          </View>
          <Money value={balance} rp size={28} color={balance < 0 ? colors.red : colors.ink} />
          {credit && balance < 0 && <Txt size={12} color={colors.muted}>owed</Txt>}
        </Card>

        {!credit && (
          <Card>
            {row.pockets.map((p) => (
              <Row key={p.id} title={names[p.id] ?? 'Pocket'} right={<Money value={p.balance} color={p.balance < 0 ? colors.red : colors.ink} />} />
            ))}
            <Row title="Free" last={!overAllocatedBy} right={<Money value={free} />} />
            {overAllocatedBy > 0 && (
              <Row last title={<Txt w="bold" color={colors.red}>Over-allocated by {formatIDR(overAllocatedBy)}</Txt>} subtitle={<Txt size={12} color={colors.muted}>Pockets hold more than the balance. Move some back to Free.</Txt>} />
            )}
          </Card>
        )}

        {newPocket !== null ? (
          <Card style={{ paddingVertical: 12, gap: 8 }}>
            <Field label="Pocket name" value={newPocket} onChangeText={setNewPocket} placeholder="Rent" autoFocus maxLength={30} onSubmitEditing={addPocket} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Add" small onPress={addPocket} disabled={!newPocket.trim()} />
              <Button title="Cancel" small kind="secondary" onPress={() => setNewPocket(null)} />
            </View>
          </Card>
        ) : (
          !credit && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Add pocket" kind="secondary" style={{ flex: 1 }} onPress={() => setNewPocket('')} />
              <Button
                title="Move money"
                kind="secondary"
                style={{ flex: 1 }}
                disabled={row.pockets.length === 0}
                onPress={() => router.push({ pathname: '/account/move', params: { id: account.id } })}
              />
            </View>
          )
        )}

        <SectionTitle title="Transactions" />
        <Card style={{ paddingVertical: 4 }}>
          <MonthStepper label={monthName(month)} onPrev={() => setMonth(addMonthsToKey(month, -1))} onNext={() => setMonth(addMonthsToKey(month, 1))} variant="plain" />
        </Card>
        {groups.length === 0 && <Txt color={colors.muted}>Nothing in {monthName(month)}.</Txt>}
        {groups.map((g) => <DayCard key={g.date} group={g} today={today} />)}
      </Screen>
    </View>
  );
}
