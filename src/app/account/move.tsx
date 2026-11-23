import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { todayJakarta } from '@/domain/dates';
import { formatIDR } from '@/domain/money';
import { accountRows, pockets } from '@/store/selectors';
import { AmountField, Button, PageHeader, Screen, Txt, goBack } from '@/ui/components';
import { ChipPicker } from '@/ui/ChipPicker';
import { useAppState, useStore } from '@/ui/StoreProvider';
import { colors } from '@/ui/theme';

const FREE = 'free';

/** Move money between Free and the account's pockets. Writes signed allocations in one batch. */
export default function MoveMoney() {
  const store = useStore();
  const { id } = useLocalSearchParams<{ id: string }>();
  const row = useAppState((s) => accountRows(s).rows.find((r) => r.account.id === id));
  const names = useAppState((s) => Object.fromEntries(pockets(s).map((p) => [p.id, p.name])));
  const [from, setFrom] = useState(FREE);
  const [to, setTo] = useState(row?.pockets[0]?.id ?? FREE);
  const [amount, setAmount] = useState(0);
  if (!row) return <PageHeader title="Move money" />;

  const holds = (k: string) => (k === FREE ? row.free : row.pockets.find((p) => p.id === k)?.balance ?? 0);
  const chips = [{ id: FREE, label: `Free · ${formatIDR(row.free)}` }, ...row.pockets.map((p) => ({ id: p.id, label: `${names[p.id]} · ${formatIDR(p.balance)}` }))];
  const tooMuch = amount > holds(from);
  const ok = amount > 0 && from !== to && !tooMuch;

  const save = async () => {
    const date = todayJakarta();
    const authorId = store.memberId ?? store.deviceId;
    await store.batch((tx) => {
      if (from !== FREE) tx.create('allocation', { pocketId: from, amount: -amount, date, authorId });
      if (to !== FREE) tx.create('allocation', { pocketId: to, amount, date, authorId });
    });
    goBack();
  };

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title={`Move money · ${row.account.name}`} />
      <Screen style={{ padding: 16, gap: 16 }}>
        <View style={{ gap: 6 }}>
          <Txt size={12} w="bold" color={colors.muted}>From</Txt>
          <ChipPicker label="From" wrap chips={chips} value={from} onChange={setFrom} />
        </View>
        <View style={{ gap: 6 }}>
          <Txt size={12} w="bold" color={colors.muted}>To</Txt>
          <ChipPicker label="To" wrap chips={chips} value={to} onChange={setTo} />
        </View>
        <AmountField
          label="Amount"
          value={amount}
          onAmount={setAmount}
          error={tooMuch}
          hint={tooMuch ? <Txt size={12} color={colors.red}>{from === FREE ? 'Free' : names[from]} only holds {formatIDR(holds(from))}.</Txt> : null}
        />
        {from === to && <Txt size={12} color={colors.muted}>Pick two different places.</Txt>}
        <Button title="Move" onPress={save} disabled={!ok} />
      </Screen>
    </View>
  );
}
