import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMonthsToKey, daysInMonthKey, monthOf, todayJakarta } from '@/domain/dates';
import { formatAmount, formatCompact, formatIDR } from '@/domain/money';
import { accounts, members, statsView } from '@/store/selectors';
import { Button, Card, IconButton, Pill, ProgressBar, Row, Screen, SectionTitle, Txt, monthName, statusColor } from '@/ui/components';
import { ChipPicker } from '@/ui/ChipPicker';
import { confirm } from '@/ui/confirm';
import { Donut } from '@/ui/Donut';
import { ChevronLeft, ChevronRight } from '@/ui/icons';
import { Kasi } from '@/ui/kasi';
import { Segmented } from '@/ui/Segmented';
import { useAppState, useStore } from '@/ui/StoreProvider';
import { chartColors, colors } from '@/ui/theme';

type Period = 'month' | 'year';
type Kind = 'expense' | 'income';

const PILL = {
  ok: { text: 'On track', color: colors.green, bg: colors.successSurface },
  warning: { text: 'Watch it', color: colors.amberText, bg: colors.warningSurface },
  over: { text: 'Over', color: colors.red, bg: colors.dangerSurface },
};
const ADVICE = { 'too-low': 'Budget looks too low', 'too-high': 'Budget looks too high', ok: 'About right' };
// A dark label reads better than white on the two yellow-orange badge colours.
const badgeInk = (bg: string) => (bg === colors.amber || bg === colors.orangeSoft ? colors.ink : colors.white);

export default function Stats() {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const today = todayJakarta();
  const [period, setPeriod] = useState<Period>('month');
  const [month, setMonth] = useState(monthOf(today));
  const [kind, setKind] = useState<Kind>('expense');
  const [memberId, setMemberId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [picked, setPicked] = useState<string | null>(null);

  const key = period === 'month' ? month : month.slice(0, 4);
  const v = useAppState((s) => statsView(s, period, key, kind, memberId, accountId));
  const people = useAppState(members);
  const accts = useAppState(accounts);

  const trendId = picked && v.rows.some((r) => r.category.id === picked) ? picked : v.rows[0]?.category.id;
  const trendRow = v.rows.find((r) => r.category.id === trendId);
  const trend = trendId !== undefined ? v.trend(trendId) : [];
  const status = v.budget.ratio > 1 ? 'over' : v.budget.ratio >= 0.8 ? 'warning' : 'ok';
  const daysLeft = month === monthOf(today) ? daysInMonthKey(month) - Number(today.slice(8)) + 1 : null;

  const setBudget = async (budgetId: string, name: string, amount: number) => {
    if (!(await confirm(`Set ${name} budget to ${formatIDR(amount)}?`, 'That is your 3-month average.', 'Set budget', false))) return;
    await store.update('budget', budgetId, { amount });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <View style={styles.headRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <IconButton label={period === 'month' ? 'Previous month' : 'Previous year'} onPress={() => setMonth(addMonthsToKey(month, period === 'month' ? -1 : -12))}>
              <ChevronLeft size={18} />
            </IconButton>
            <Txt w="extrabold" size={16}>{period === 'month' ? monthName(month, true) : key}</Txt>
            <IconButton label={period === 'month' ? 'Next month' : 'Next year'} onPress={() => setMonth(addMonthsToKey(month, period === 'month' ? 1 : 12))}>
              <ChevronRight size={18} />
            </IconButton>
          </View>
          <View style={{ width: 170 }}>
            <Segmented label="Kind" value={kind} onChange={setKind} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
          </View>
        </View>
        <Segmented label="Period" value={period} onChange={setPeriod} options={[{ value: 'month', label: 'Month' }, { value: 'year', label: 'Year' }]} />
      </View>

      <Screen pad={24} style={{ padding: 16, gap: 12 }}>
        {people.length > 1 && <ChipPicker label="Member" chips={[{ id: '', label: 'Everyone' }, ...people.map((m) => ({ id: m.id, label: m.name }))]} value={memberId} onChange={setMemberId} />}
        <ChipPicker label="Account" chips={[{ id: '', label: 'All accounts' }, ...accts.map((a) => ({ id: a.id, label: a.name }))]} value={accountId} onChange={setAccountId} />

        <Card style={styles.summary}>
          <Donut
            shares={v.rows.map((r) => r.share)}
            palette={chartColors}
            label={kind === 'expense' ? 'Spent' : 'Earned'}
            value={formatCompact(v.total)}
            a11y={`${kind === 'expense' ? 'Expense' : 'Income'} by category: ${v.rows.map((r) => `${r.category.name} ${Math.round(r.share * 100)} percent`).join(', ') || 'nothing yet'}`}
          />
          {kind === 'expense' && v.budget.limit > 0 ? (
            <View style={{ flex: 1, gap: 6 }}>
              <Txt size={12} color={colors.muted}>Budget</Txt>
              <Txt w="extrabold" size={20}>{Math.round(v.budget.ratio * 100)}% used</Txt>
              <Txt size={12} color={colors.muted}>
                {v.budget.left >= 0 ? `${formatIDR(v.budget.left)} left` : `${formatIDR(-v.budget.left)} over`}
                {daysLeft && period === 'month' ? ` for ${daysLeft} day${daysLeft > 1 ? 's' : ''}` : ''}
              </Txt>
              <Pill {...PILL[status]} />
            </View>
          ) : (
            <View style={{ flex: 1, gap: 6 }}>
              <Txt size={12} color={colors.muted}>{kind === 'expense' ? 'Spent' : 'Earned'}</Txt>
              <Txt w="extrabold" size={20}>{formatIDR(v.total)}</Txt>
            </View>
          )}
        </Card>

        {v.hint && (
          <View style={styles.hint}>
            <Kasi mood="panic" size={44} />
            <Txt size={13} color={colors.dangerInk} style={{ flex: 1, lineHeight: 18 }}>
              <Txt size={13} w="bold">{v.hint.category.name} is over by {formatIDR(v.hint.overBy)}.</Txt> Your 3-month average is {formatAmount(v.hint.avg3)}.{' '}
              {v.hint.avg3 > 0 && (
                <Txt size={13} w="extrabold" color={colors.green} accessibilityRole="button" onPress={() => setBudget(v.hint!.budget.id, v.hint!.category.name, v.hint!.avg3)}>
                  Adjust budget
                </Txt>
              )}
            </Txt>
          </View>
        )}

        {v.rows.length === 0 ? (
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 24 }}>
            <Kasi mood="thinking" size={64} />
            <Txt w="bold">Nothing in {period === 'month' ? monthName(month) : key} yet</Txt>
          </View>
        ) : (
          <Card>
            {v.rows.map((r, i) => {
              const bg = chartColors[i % chartColors.length];
              const over = r.budget?.status === 'over';
              return (
                <Row
                  key={r.category.id || 'none'}
                  last={i === v.rows.length - 1}
                  onPress={() => setPicked(r.category.id)}
                  label={`${r.category.name}, ${Math.round(r.share * 100)} percent, ${formatAmount(r.amount)}${r.budget ? `, ${Math.round(r.budget.ratio * 100)} percent of budget` : ''}. Show trend`}
                  left={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={[styles.badge, { backgroundColor: bg }]}><Txt size={11} w="extrabold" color={badgeInk(bg)}>{Math.round(r.share * 100)}%</Txt></View>
                      <Text style={{ fontSize: 20 }}>{r.category.emoji}</Text>
                    </View>
                  }
                  title={
                    <View style={{ gap: 5 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Txt w="bold" numberOfLines={1} style={{ flex: 1 }}>{r.category.name}</Txt>
                        <Txt w="bold" color={over ? colors.red : colors.ink}>{formatAmount(r.amount)}</Txt>
                      </View>
                      {r.budget && <ProgressBar ratio={r.budget.ratio} color={statusColor(r.budget.status)} height={5} />}
                    </View>
                  }
                />
              );
            })}
          </Card>
        )}

        <SectionTitle title="Income vs expense" />
        <Card style={{ paddingVertical: 14 }}>
          <Bars
            data={v.flow.map((f) => ({ key: f.monthKey, values: [f.income, f.expense] }))}
            colors={[colors.accent, colors.redStrong]}
            a11y={v.flow.map((f) => `${monthName(f.monthKey, true)}: income ${formatAmount(f.income)}, expense ${formatAmount(f.expense)}`).join('; ')}
          />
          {(() => {
            const last = v.flow.find((f) => f.monthKey === (period === 'month' ? month : '')) ?? v.flow.filter((f) => f.income || f.expense).at(-1);
            return last ? (
              <Txt size={12} color={colors.muted} style={{ marginTop: 8 }}>
                {monthName(last.monthKey)}: saved {formatIDR(last.saved)} · savings rate {Math.round(last.savingsRate * 100)}%
              </Txt>
            ) : null;
          })()}
        </Card>

        {trendRow && (
          <>
            <SectionTitle title={`${trendRow.category.emoji} ${trendRow.category.name}, 12 months`} />
            <Card style={{ paddingVertical: 14 }}>
              <Bars
                data={trend.map((t) => ({ key: t.monthKey, values: [t.amount] }))}
                colors={[kind === 'expense' ? colors.purple : colors.accent]}
                a11y={trend.map((t) => `${monthName(t.monthKey, true)} ${formatAmount(t.amount)}`).join('; ')}
              />
              <Txt size={12} color={colors.muted} style={{ marginTop: 8 }}>Tap a category above to see its trend.</Txt>
            </Card>
          </>
        )}

        {kind === 'expense' && v.top.length > 0 && (
          <>
            <SectionTitle title="Top merchants" />
            <Card>
              {v.top.map((t, i) => (
                <Row key={t.name} last={i === v.top.length - 1} title={t.name} subtitle={`${t.count} transaction${t.count > 1 ? 's' : ''}`} right={<Txt w="bold">{formatAmount(t.amount)}</Txt>} />
              ))}
            </Card>
          </>
        )}

        {kind === 'expense' && v.tuning.length > 0 && (
          <>
            <SectionTitle title="Tune your budgets" />
            <Card>
              {v.tuning.map((t, i) => (
                <Row
                  key={t.budget.id}
                  last={i === v.tuning.length - 1}
                  left={<Text style={{ fontSize: 20 }}>{t.category.emoji}</Text>}
                  title={`${t.category.name} · ${formatAmount(t.budget.amount)}`}
                  subtitle={
                    <View style={{ gap: 2 }}>
                      <Txt size={12} color={colors.muted}>3-mo avg {formatAmount(t.avg3)} · 12-mo avg {formatAmount(t.avg12)}</Txt>
                      <Txt size={12} w="bold" color={t.advice === 'ok' ? colors.green : colors.amberText}>{ADVICE[t.advice]}</Txt>
                    </View>
                  }
                  right={t.advice !== 'ok' && t.avg3 > 0 ? <Button title="Set to average" small kind="secondary" onPress={() => setBudget(t.budget.id, t.category.name, t.avg3)} /> : null}
                />
              ))}
            </Card>
          </>
        )}
      </Screen>
    </View>
  );
}

/** Simple grouped bars, one group per month, scaled to the largest value. */
function Bars({ data, colors: palette, a11y }: { data: { key: string; values: number[] }[]; colors: string[]; a11y: string }) {
  const max = Math.max(1, ...data.flatMap((d) => d.values));
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={a11y}>
      <View style={styles.bars}>
        {data.map((d) => (
          <View key={d.key} style={styles.barGroup}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: 96 }}>
              {d.values.map((val, i) => (
                <View key={i} style={{ width: d.values.length > 1 ? 7 : 12, height: Math.max(val > 0 ? 2 : 0, (val / max) * 96), backgroundColor: palette[i], borderRadius: 2 }} />
              ))}
            </View>
            <Txt size={10} color={colors.muted}>{monthName(d.key, true)[0]}</Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.card, paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 16 },
  hint: { backgroundColor: colors.dangerSurface, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: { width: 40, borderRadius: 6, paddingVertical: 3, alignItems: 'center' },
  bars: { flexDirection: 'row', justifyContent: 'space-between' },
  barGroup: { alignItems: 'center', gap: 4, flex: 1 },
});
