import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Goal } from '@/domain/types';
import { goals, pockets } from '@/store/selectors';
import { AmountField, Button, Field, PageHeader, Screen, goBack } from '@/ui/components';
import { EmojiPicker } from '@/ui/EmojiPicker';
import { FundingPicker, draftOf, draftReady, fundingFrom } from '@/ui/FundingPicker';
import { useAppState, useStore } from '@/ui/StoreProvider';

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** New goal, or edit one with ?id=. */
export default function EditGoal() {
  const store = useStore();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const goal = useAppState((s) => (id ? goals(s).find((g) => g.id === id) : undefined));
  const pocketAccount = useAppState((s) => (pid: string) => pockets(s).find((p) => p.id === pid)?.accountId);

  const [name, setName] = useState(goal?.name ?? '');
  const [emoji, setEmoji] = useState(goal?.emoji ?? '✈️');
  const [target, setTarget] = useState(goal?.target ?? 0);
  const [date, setDate] = useState(goal?.targetDate ?? '');
  const [funding, setFunding] = useState(() => draftOf(goal?.funding, pocketAccount));
  const ok = name.trim() && target > 0 && (date === '' || DATE.test(date)) && draftReady(funding);

  const save = async () => {
    await store.batch((tx) => {
      const data: Partial<Goal> = { name: name.trim(), emoji, target, funding: fundingFrom(funding, tx), ...(date && { targetDate: date }) };
      if (goal) {
        const changed: Record<string, unknown> = Object.fromEntries(Object.entries(data).filter(([k, v]) => JSON.stringify(goal[k as keyof Goal]) !== JSON.stringify(v)));
        if (!date && goal.targetDate) changed.targetDate = null;
        tx.update('goal', goal.id, changed);
      } else {
        tx.create('goal', data);
      }
    });
    goBack();
  };

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title={goal ? 'Edit goal' : 'New goal'} />
      <Screen style={{ padding: 16, gap: 16 }}>
        <Field label="Name" value={name} onChangeText={setName} placeholder="Bali trip" maxLength={40} />
        <EmojiPicker value={emoji} onChange={setEmoji} />
        <AmountField label="Target" value={target} onAmount={setTarget} />
        <Field label="Target date (optional)" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" maxLength={10} error={date.length === 10 && !DATE.test(date)} />
        <FundingPicker value={funding} onChange={setFunding} />
        <Button title="Save" onPress={save} disabled={!ok} />
      </Screen>
    </View>
  );
}
