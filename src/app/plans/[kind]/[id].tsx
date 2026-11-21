import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { todayJakarta } from '@/domain/dates';
import { formatIDR } from '@/domain/money';
import { Funding } from '@/domain/types';
import { accountOf, categoryOf, plansView, pockets } from '@/store/selectors';
import { AmountField, Button, Card, IconCircle, PageHeader, ProgressBar, Row, Screen, Txt, goBack, monthName, shortDate } from '@/ui/components';
import { confirm } from '@/ui/confirm';
import { markSetAside, payBill } from '@/ui/planActions';
import { useAppState, useStore } from '@/ui/StoreProvider';
import { colors } from '@/ui/theme';

const REPEAT = { once: 'Once', monthly: 'Every month', yearly: 'Every year', everyNMonths: 'Every few months' };

export default function PlanDetail() {
  const store = useStore();
  const { kind, id } = useLocalSearchParams<{ kind: 'bill' | 'goal'; id: string }>();
  const today = todayJakarta();
  const v = useAppState((s) => plansView(s, today));
  const fundingLabel = useAppState((s) => (f: Funding) => {
    if (f.kind === 'account') return `${accountOf(s, f.accountId)?.name ?? 'Account'} (whole account)`;
    const p = pockets(s).find((x) => x.id === f.pocketId);
    return p ? `${p.name} (pocket in ${accountOf(s, p.accountId)?.name ?? '?'})` : 'A deleted pocket';
  });
  const categoryName = useAppState((s) => (cid?: string) => categoryOf(s, cid)?.name);
  const [aside, setAside] = useState<number | null>(null);
  const [options, setOptions] = useState(false);

  const billRow = kind === 'bill' ? v.bills.find((b) => b.bill.id === id) : undefined;
  const goalRow = kind === 'goal' ? v.goals.find((g) => g.goal.id === id) : undefined;
  const item = billRow?.bill ?? goalRow?.goal;
  if (!item) {
    return (
      <View style={{ flex: 1 }}>
        <PageHeader title="Plan" />
        <Txt color={colors.muted} style={{ padding: 16 }}>This {kind ?? 'plan'} was deleted.</Txt>
      </View>
    );
  }

  const month = (billRow ?? goalRow)!.month;
  const target = billRow ? billRow.bill.amount : goalRow!.goal.target;
  const perMonth = billRow ? billRow.month.plan.monthly : goalRow!.month.plan.required ?? 0;
  const suggested = Math.max(0, perMonth - month.setAside);
  const amount = aside ?? suggested;

  const remove = async () => {
    if (!(await confirm(`Delete ${item.name}?`, 'Its pocket and the money in it stay where they are.', 'Delete', true))) return;
    await store.remove(kind, item.id);
    goBack();
  };
  const setAsideNow = async () => {
    await markSetAside(store, item.funding, amount, item.name);
    setAside(null);
  };

  return (
    <View style={{ flex: 1 }}>
      <PageHeader
        title={item.name}
        right={<Button title="Edit" kind="ghost" small onPress={() => router.push({ pathname: kind === 'bill' ? '/plans/bill' : '/plans/goal', params: { id: item.id } })} />}
      />
      <Screen style={{ padding: 16, gap: 12 }}>
        <Card style={{ paddingVertical: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconCircle emoji={item.emoji ?? (billRow ? '🧾' : '🎯')} size={44} />
            <View style={{ flex: 1 }}>
              <Txt w="extrabold" size={20}>{formatIDR(target)}</Txt>
              <Txt size={12} color={colors.muted}>
                {billRow
                  ? `${REPEAT[billRow.bill.recurrence.kind]} · due ${shortDate(billRow.bill.dueDate)} ${billRow.bill.dueDate.slice(0, 4)}${billRow.bill.paidAt ? ' · paid' : ''}`
                  : goalRow!.goal.targetDate ? `By ${monthName(goalRow!.goal.targetDate)}` : 'No target date'}
              </Txt>
            </View>
          </View>
          <ProgressBar ratio={target > 0 ? month.funded / target : 0} height={8} />
          <Txt size={12} color={colors.muted}>{formatIDR(month.funded)} of {formatIDR(target)} saved</Txt>
        </Card>

        <Card>
          <Row title="Funded by" subtitle={fundingLabel(item.funding)} />
          {billRow && <Row title="Booked to" subtitle={categoryName(billRow.bill.categoryId) ?? 'No category'} />}
          <Row title="This month" subtitle={`Set aside ${formatIDR(month.setAside)} of ${formatIDR(perMonth)}`} last={!(billRow && billRow.month.plan.behindBy > 0)} />
          {billRow && billRow.month.plan.behindBy > 0 && <Row last title={<Txt w="bold" color={colors.amberText}>Behind by {formatIDR(billRow.month.plan.behindBy)}</Txt>} />}
        </Card>

        {billRow?.month.plan.overdue && (
          <Txt w="bold" color={colors.overdueText}>{billRow.month.plan.daysOverdue} day{billRow.month.plan.daysOverdue > 1 ? 's' : ''} overdue</Txt>
        )}

        {month.funded < target && (
          <Card style={{ paddingVertical: 12, gap: 10 }}>
            <AmountField label="Set aside now" value={amount} onAmount={setAside} />
            <Button title={item.funding.kind === 'pocket' ? 'Mark set aside' : 'Mark set aside (transfer)'} onPress={setAsideNow} disabled={amount <= 0} />
          </Card>
        )}

        {billRow && !(billRow.bill.recurrence.kind === 'once' && billRow.bill.paidAt) && (
          <Button title="Paid" kind={billRow.month.plan.overdue ? 'danger' : 'secondary'} onPress={() => payBill(store, billRow.bill)} />
        )}

        {goalRow && goalRow.month.plan.gap > 0 && !options && <Button title="See options" kind="secondary" onPress={() => setOptions(true)} />}
        {goalRow && options && (
          <Card style={{ paddingVertical: 12, gap: 8 }}>
            <Txt w="bold">Needs {formatIDR(goalRow.month.plan.required ?? 0)}/mo, you can afford {formatIDR(goalRow.affordable)}.</Txt>
            {goalRow.options.extendTo && (
              <Button title={`Move date to ${monthName(goalRow.options.extendTo, true)}`} onPress={async () => { await store.update('goal', goalRow.goal.id, { targetDate: goalRow.options.extendTo }); setOptions(false); }} />
            )}
            {goalRow.options.lowerTargetTo !== null && goalRow.options.lowerTargetTo > 0 && goalRow.options.lowerTargetTo < goalRow.goal.target && (
              <Button title={`Lower target to ${formatIDR(goalRow.options.lowerTargetTo)}`} kind="secondary" onPress={async () => { await store.update('goal', goalRow.goal.id, { target: goalRow.options.lowerTargetTo }); setOptions(false); }} />
            )}
            <Button title="Keep as is" kind="ghost" onPress={() => setOptions(false)} />
          </Card>
        )}

        <Button title={`Delete ${kind}`} kind="ghost" onPress={remove} />
      </Screen>
    </View>
  );
}
