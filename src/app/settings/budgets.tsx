import { useState } from 'react';
import { View } from 'react-native';
import { formatAmount, formatIDR } from '@/domain/money';
import { Budget } from '@/domain/types';
import { budgets, categories, monthlyBudgetTotal } from '@/store/selectors';
import { AmountPad } from '@/ui/AmountPad';
import { Button, Card, IconCircle, PageHeader, Row, Screen, Txt } from '@/ui/components';
import { Segmented } from '@/ui/Segmented';
import { useAppState, useStore } from '@/ui/StoreProvider';
import { colors } from '@/ui/theme';

export default function Budgets() {
  const cats = useAppState((s) => categories(s).filter((c) => c.kind === 'expense'));
  const byCat = useAppState((s) => Object.fromEntries(budgets(s).map((b) => [b.categoryId, b])));
  const total = useAppState(monthlyBudgetTotal);
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Budgets" />
      <Screen style={{ padding: 16, gap: 12 }}>
        <Card style={{ paddingVertical: 14 }}>
          <Txt size={12} w="semibold" color={colors.muted}>Monthly total</Txt>
          <Txt w="extrabold" size={24}>{formatIDR(total)}</Txt>
          <Txt size={12} color={colors.muted}>Yearly budgets count as one twelfth each month.</Txt>
        </Card>
        <Card>
          {cats.map((c, i) => {
            const b = byCat[c.id];
            return editing === c.id ? (
              <Editor key={c.id} categoryId={c.id} name={c.name} budget={b} onDone={() => setEditing(null)} />
            ) : (
              <Row
                key={c.id}
                last={i === cats.length - 1}
                onPress={() => setEditing(c.id)}
                label={`${c.name} budget: ${b ? `${formatAmount(b.amount)} ${b.period}` : 'none'}`}
                left={<IconCircle emoji={c.emoji} size={36} />}
                title={c.name}
                right={b ? <Txt w="bold">{formatAmount(b.amount)}<Txt size={12} color={colors.muted}>{b.period === 'monthly' ? ' /mo' : ' /yr'}</Txt></Txt> : <Txt color={colors.muted}>No budget</Txt>}
              />
            );
          })}
        </Card>
      </Screen>
    </View>
  );
}

function Editor({ categoryId, name, budget, onDone }: { categoryId: string; name: string; budget?: Budget; onDone: () => void }) {
  const store = useStore();
  const [digits, setDigits] = useState(budget ? String(budget.amount) : '');
  const [period, setPeriod] = useState<Budget['period']>(budget?.period ?? 'monthly');
  const amount = Number(digits || 0);
  const save = async () => {
    if (budget) await store.update('budget', budget.id, { ...(amount !== budget.amount && { amount }), ...(period !== budget.period && { period }) });
    else await store.create('budget', { categoryId, amount, period });
    onDone();
  };
  const clear = async () => {
    if (budget) await store.remove('budget', budget.id);
    onDone();
  };
  return (
    <View style={{ paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
      <Txt w="bold">{name}</Txt>
      <Txt w="extrabold" size={28} style={{ textAlign: 'center' }} accessibilityLiveRegion="polite">
        <Txt size={14} color={colors.muted}>Rp </Txt>{formatAmount(amount)}
      </Txt>
      <Segmented label="Period" value={period} onChange={setPeriod} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} />
      <AmountPad value={digits} onChange={setDigits} />
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
        <Button title="Save" small onPress={save} disabled={amount <= 0} />
        <Button title="Cancel" small kind="secondary" onPress={onDone} />
        {budget && <Button title="No budget" small kind="ghost" onPress={clear} style={{ marginLeft: 'auto' }} />}
      </View>
    </View>
  );
}
