import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { todayJakarta } from '@/domain/dates';
import { Bill, Recurrence } from '@/domain/types';
import { bills, categories, pockets } from '@/store/selectors';
import { ChipPicker } from '@/ui/ChipPicker';
import { AmountField, Button, Field, PageHeader, Screen, Txt, goBack } from '@/ui/components';
import { EmojiPicker } from '@/ui/EmojiPicker';
import { FundingPicker, draftOf, draftReady, fundingFrom } from '@/ui/FundingPicker';
import { useAppState, useStore } from '@/ui/StoreProvider';
import { colors } from '@/ui/theme';

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** New bill, or edit one with ?id=. */
export default function EditBill() {
  const store = useStore();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const bill = useAppState((s) => (id ? bills(s).find((b) => b.id === id) : undefined));
  const cats = useAppState((s) => categories(s).filter((c) => c.kind === 'expense'));
  const pocketAccount = useAppState((s) => (pid: string) => pockets(s).find((p) => p.id === pid)?.accountId);

  const [name, setName] = useState(bill?.name ?? '');
  const [emoji, setEmoji] = useState(bill?.emoji ?? '🧾');
  const [amount, setAmount] = useState(bill?.amount ?? 0);
  const [due, setDue] = useState(bill?.dueDate ?? '');
  const [repeat, setRepeat] = useState<Recurrence['kind']>(bill?.recurrence.kind ?? 'monthly');
  const [every, setEvery] = useState(bill?.recurrence.kind === 'everyNMonths' ? String(bill.recurrence.n) : '3');
  const [categoryId, setCategoryId] = useState(bill?.categoryId ?? '');
  const [funding, setFunding] = useState(() => draftOf(bill?.funding, pocketAccount));

  const n = Number(every);
  const ok = name.trim() && amount > 0 && DATE.test(due) && draftReady(funding) && (repeat !== 'everyNMonths' || (Number.isInteger(n) && n >= 2 && n <= 60));

  const save = async () => {
    const recurrence: Recurrence = repeat === 'everyNMonths' ? { kind: 'everyNMonths', n } : { kind: repeat };
    await store.batch((tx) => {
      const data: Partial<Bill> = { name: name.trim(), emoji, amount, dueDate: due, recurrence, funding: fundingFrom(funding, tx), ...(categoryId && { categoryId }) };
      if (bill) {
        const changed: Record<string, unknown> = Object.fromEntries(Object.entries(data).filter(([k, v]) => JSON.stringify(bill[k as keyof Bill]) !== JSON.stringify(v)));
        if (!categoryId && bill.categoryId) changed.categoryId = null;
        // A new due date on a paid one-off bill makes it due again.
        if (bill.paidAt && due !== bill.dueDate) changed.paidAt = null;
        tx.update('bill', bill.id, changed);
      } else {
        tx.create('bill', { ...data, reminderOffsetsDays: [7, 1, 0], createdAt: todayJakarta() });
      }
    });
    goBack();
  };

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title={bill ? 'Edit bill' : 'New bill'} />
      <Screen style={{ padding: 16, gap: 16 }}>
        <Field label="Name" value={name} onChangeText={setName} placeholder="Vehicle tax" maxLength={40} />
        <EmojiPicker value={emoji} onChange={setEmoji} />
        <AmountField label="Amount" value={amount} onAmount={setAmount} />
        <Field label="Due date" value={due} onChangeText={setDue} placeholder="YYYY-MM-DD" maxLength={10} error={due.length === 10 && !DATE.test(due)} />
        <View style={{ gap: 6 }}>
          <Txt size={12} w="bold" color={colors.muted}>Repeats</Txt>
          <ChipPicker
            label="Repeats"
            chips={[{ id: 'once', label: 'Once' }, { id: 'monthly', label: 'Monthly' }, { id: 'yearly', label: 'Yearly' }, { id: 'everyNMonths', label: 'Every N months' }]}
            value={repeat}
            onChange={(k) => setRepeat(k as Recurrence['kind'])}
          />
          {repeat === 'everyNMonths' && <Field label="Every how many months" value={every} onChangeText={(t) => setEvery(t.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={2} />}
        </View>
        <View style={{ gap: 6 }}>
          <Txt size={12} w="bold" color={colors.muted}>Booked to category</Txt>
          <ChipPicker label="Category" chips={cats.map((c) => ({ id: c.id, label: c.name, emoji: c.emoji }))} value={categoryId} onChange={setCategoryId} />
        </View>
        <FundingPicker value={funding} onChange={setFunding} />
        <Txt size={12} color={colors.muted}>Reminders 7 days, 1 day and on the day (coming in a later update).</Txt>
        <Button title="Save" onPress={save} disabled={!ok} />
      </Screen>
    </View>
  );
}
