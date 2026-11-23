import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { daysBetween, todayJakarta } from '@/domain/dates';
import { formatAmount, formatCompact, formatIDR } from '@/domain/money';
import { plansView } from '@/store/selectors';
import { Button, Card, IconCircle, ProgressBar, Screen, Txt, monthName, shortDate } from '@/ui/components';
import { PlusIcon } from '@/ui/icons';
import { Kasi } from '@/ui/kasi';
import { payBill } from '@/ui/planActions';
import { Ring } from '@/ui/Ring';
import { useAppState, useStore } from '@/ui/StoreProvider';
import { chartColors, colors, radius } from '@/ui/theme';

/** A due date far off reads as its month ("May"); a near one as day and month ("1 Dec"). */
const dueChip = (today: string, due: string) => (daysBetween(today, due) > 60 ? monthName(due, true).slice(0, 3) : shortDate(due));

export default function Plans() {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const today = todayJakarta();
  const v = useAppState((s) => plansView(s, today));
  const [choosing, setChoosing] = useState(false);
  const { summary } = v;
  // Overdue bills show as banners, as in the mockup; the grid holds the rest.
  const current = v.bills.filter((b) => !b.month.plan.overdue);
  const open = (kind: 'bill' | 'goal', id: string) => router.push({ pathname: '/plans/[kind]/[id]', params: { kind, id } });

  return (
    <Screen pad={24} style={{ paddingTop: insets.top + 16, paddingHorizontal: 16, gap: 12 }}>
      <View style={styles.titleRow}>
        <Txt w="extrabold" size={22} accessibilityRole="header">Plans</Txt>
        {choosing ? (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Button title="Bill" small onPress={() => { setChoosing(false); router.push('/plans/bill'); }} />
            <Button title="Goal" small onPress={() => { setChoosing(false); router.push('/plans/goal'); }} />
            <Button title="Cancel" small kind="secondary" onPress={() => setChoosing(false)} />
          </View>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel="New bill or goal" hitSlop={4} onPress={() => setChoosing(true)} style={({ pressed }) => [styles.newBtn, pressed && { opacity: 0.8 }]}>
            <PlusIcon size={16} color={colors.white} />
            <Txt w="bold" size={13} color={colors.white}>New</Txt>
          </Pressable>
        )}
      </View>

      <View style={styles.hero}>
        <View style={{ flex: 1 }}>
          <Txt w="semibold" size={12} color={colors.white} style={{ opacity: 0.85 }}>Set aside each month</Txt>
          <Txt w="extrabold" size={26} color={colors.white}>{formatIDR(summary.total)}</Txt>
          <Txt size={12} color={colors.white} style={{ opacity: 0.85 }}>Bills {formatAmount(summary.billsMonthly)} · Goals {formatAmount(summary.goalsMonthly)}</Txt>
        </View>
        {summary.itemCount > 0 && <Ring done={summary.doneCount} total={summary.itemCount} />}
      </View>

      {v.bills.filter((b) => b.month.plan.overdue).map(({ bill, month }) => (
        <View key={bill.id} style={styles.overdue}>
          <Kasi mood="panic" size={54} />
          <Pressable style={{ flex: 1 }} onPress={() => open('bill', bill.id)} accessibilityRole="button" accessibilityLabel={`${bill.name} details`}>
            <Txt w="extrabold">{bill.name} is {month.plan.daysOverdue} day{month.plan.daysOverdue > 1 ? 's' : ''} overdue!</Txt>
            <Txt size={12} color={colors.dangerDeep}>{formatIDR(bill.amount)} · pay it before it gets worse</Txt>
          </Pressable>
          <Button title="Paid" small kind="danger" onPress={() => payBill(store, bill)} />
        </View>
      ))}

      {v.bills.length === 0 && v.goals.length === 0 && (
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }}>
          <Kasi mood="thinking" size={72} />
          <Txt w="bold" style={{ textAlign: 'center' }}>Add a bill you pay every month or year, or a goal you save for.</Txt>
        </View>
      )}

      {current.length > 0 && (
        <>
          <View style={styles.section}>
            <Txt w="extrabold" size={16} accessibilityRole="header">Bills</Txt>
            <Txt size={12} color={colors.muted}>{formatIDR(summary.billsMonthly)}/mo</Txt>
          </View>
          <View style={styles.grid}>
            {current.map(({ bill, month }, i) => {
              const tint = chartColors[(i + 4) % chartColors.length];
              const ratio = bill.amount > 0 ? month.funded / bill.amount : 0;
              const funded = month.funded >= bill.amount;
              return (
                <Pressable
                  key={bill.id}
                  onPress={() => open('bill', bill.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${bill.name}, due ${shortDate(bill.dueDate)}, ${formatAmount(month.plan.monthly)} a month`}
                  style={({ pressed }) => [styles.billCard, pressed && { opacity: 0.7 }]}
                >
                  <View style={styles.billTop}>
                    <IconCircle emoji={bill.emoji ?? '🧾'} size={40} bg={tint} />
                    <View style={styles.chip}>
                      <Txt w="bold" size={11} color={colors.muted}>{dueChip(today, bill.dueDate)}</Txt>
                    </View>
                  </View>
                  <View>
                    <Txt w="extrabold" numberOfLines={1}>{bill.name}</Txt>
                    <Txt size={12} color={colors.muted}>{formatAmount(month.plan.monthly)}/mo</Txt>
                  </View>
                  <ProgressBar ratio={ratio} color={funded ? colors.accent : tint} height={6} />
                  {funded ? (
                    <Txt w="bold" size={11} color={colors.green}>Funded ✓</Txt>
                  ) : month.plan.behindBy > 0 ? (
                    <Txt w="bold" size={11} color={colors.amberText}>Behind by {formatIDR(month.plan.behindBy)}</Txt>
                  ) : (
                    <Txt size={11} color={colors.muted}>{formatCompact(month.funded)} of {formatCompact(bill.amount)}</Txt>
                  )}
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      {v.goals.length > 0 && (
        <>
          <View style={styles.section}>
            <Txt w="extrabold" size={16} accessibilityRole="header">Goals</Txt>
            <Txt size={12} color={colors.muted}>{v.goals.filter((g) => g.month.funded < g.goal.target).length} active</Txt>
          </View>
          {v.goals.map(({ goal, month, affordable }) => {
            const ratio = goal.target > 0 ? month.funded / goal.target : 0;
            const reached = month.funded >= goal.target;
            const gap = month.plan.gap > 0;
            return (
              <Pressable key={goal.id} onPress={() => open('goal', goal.id)} accessibilityRole="button" accessibilityLabel={`${goal.name}, ${Math.round(ratio * 100)} percent`}>
                <Card style={{ paddingVertical: 12, gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    {reached ? <Kasi mood="celebrating" size={40} /> : <IconCircle emoji={goal.emoji ?? '🎯'} size={40} bg={colors.blue} />}
                    <View style={{ flex: 1 }}>
                      <Txt w="extrabold">{goal.name}</Txt>
                      <Txt size={12} color={colors.muted}>
                        {formatCompact(month.funded)} of {formatCompact(goal.target)}{goal.targetDate ? ` · ${monthName(goal.targetDate, true)}` : ''}
                      </Txt>
                    </View>
                    <Txt w="extrabold">{Math.min(100, Math.round(ratio * 100))}%</Txt>
                  </View>
                  <ProgressBar ratio={ratio} color={reached ? colors.accent : colors.blue} height={6} />
                  {reached ? (
                    <Txt w="bold" size={12} color={colors.green}>Reached! 🎉</Txt>
                  ) : month.plan.required !== null ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Txt size={12} color={colors.muted}>Need {formatCompact(month.plan.required)}/mo · can afford {formatCompact(affordable)}</Txt>
                      {gap && <Txt w="bold" size={12} color={colors.amberText}>See options</Txt>}
                    </View>
                  ) : (
                    <Txt size={12} color={colors.muted}>No date · can afford {formatCompact(affordable)}/mo</Txt>
                  )}
                </Card>
              </Pressable>
            );
          })}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, backgroundColor: colors.accent, borderRadius: radius.chip },
  hero: { backgroundColor: colors.accent, borderRadius: radius.card, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  overdue: { backgroundColor: colors.dangerSurface, borderRadius: radius.small, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  billCard: { width: '48%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.small, padding: 12, gap: 8 },
  billTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  chip: { backgroundColor: colors.hairline, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
});
