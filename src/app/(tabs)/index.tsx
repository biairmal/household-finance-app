import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMonthsToKey, monthOf, todayJakarta } from '@/domain/dates';
import { formatAmount, formatIDR } from '@/domain/money';
import { ACCOUNT_TYPES, accountRows, homeSummary, homeTip, members } from '@/store/selectors';
import { Card, IconButton, IconCircle, Money, MonthStepper, ProgressBar, Row, Screen, SectionTitle, Txt, monthName } from '@/ui/components';
import { GearIcon } from '@/ui/icons';
import { Kasi } from '@/ui/kasi';
import { useAppState, useStore } from '@/ui/StoreProvider';
import { colors, radius } from '@/ui/theme';

export default function Home() {
  const store = useStore();
  const insets = useSafeAreaInsets();
  const today = todayJakarta();
  const [month, setMonth] = useState(monthOf(today));
  const summary = useAppState((s) => homeSummary(s, month));
  const { rows, netWorth } = useAppState(accountRows);
  const tip = useAppState((s) => homeTip(s, today));
  const people = useAppState(members);
  const me = people.find((m) => m.id === store.memberId);
  const avatars = [...people].sort((a) => (a.id === store.memberId ? -1 : 1)).slice(0, 3);

  return (
    <Screen pad={24}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <View style={styles.who}>
            <View style={{ flexDirection: 'row' }}>
              {avatars.map((m, i) => (
                <View key={m.id} style={[styles.avatar, i > 0 && { marginLeft: -8, backgroundColor: colors.wife }]}>
                  <Txt w="extrabold" size={13} color={i > 0 ? colors.wifeInk : colors.green}>{m.initial}</Txt>
                </View>
              ))}
            </View>
            <View>
              <Txt size={12} color={colors.white} style={{ opacity: 0.85 }}>Our household</Txt>
              <Txt w="extrabold" size={17} color={colors.white}>Hi, {me?.name ?? 'there'}</Txt>
            </View>
          </View>
          <IconButton label="Settings" onPress={() => router.push('/settings')} style={styles.gear}>
            <GearIcon color={colors.white} />
          </IconButton>
        </View>
      </View>

      <View style={styles.summary}>
        <MonthStepper label={monthName(month)} onPrev={() => setMonth(addMonthsToKey(month, -1))} onNext={() => setMonth(addMonthsToKey(month, 1))} />
        <View style={styles.totals}>
          <Total label="Income" value={summary.income} color={colors.green} />
          <Total label="Expense" value={summary.expense} color={colors.red} divider />
          <Total label="Total" value={summary.net} divider />
        </View>
        {summary.budgetLimit > 0 && (
          <View style={{ gap: 6 }}>
            <ProgressBar ratio={summary.budgetRatio} color={summary.budgetRatio > 1 ? colors.redStrong : summary.budgetRatio >= 0.8 ? colors.amber : colors.accent} />
            <View style={styles.between}>
              <Txt size={12} color={colors.muted}>Budget {Math.round(summary.budgetRatio * 100)}% used</Txt>
              <Txt size={12} w="bold" color={summary.budgetLeft < 0 ? colors.red : colors.ink}>
                {summary.budgetLeft < 0 ? `${formatIDR(-summary.budgetLeft)} over` : `${formatIDR(summary.budgetLeft)} left`}
              </Txt>
            </View>
          </View>
        )}
      </View>

      <View style={styles.tip}>
        <Kasi mood="happy" size={40} />
        <View style={{ flex: 1 }}>
          {tip.kind === 'overdue' && (
            <Txt size={13} color={colors.warningInk} style={styles.tipText}>
              {tip.bill.name} is <Txt w="bold" size={13} color={colors.overdueText}>{tip.days} day{tip.days === 1 ? '' : 's'} overdue</Txt>.{' '}
              <Txt w="extrabold" size={13} color={colors.green} onPress={() => router.push('/plans')} accessibilityRole="link">Pay now</Txt>
            </Txt>
          )}
          {tip.kind === 'over' && (
            <Txt size={13} color={colors.warningInk} style={styles.tipText}>
              {tip.category.name} is <Txt w="bold" size={13} color={colors.overdueText}>over by {formatIDR(tip.overBy)}</Txt>.{' '}
              <Txt w="extrabold" size={13} color={colors.green} onPress={() => router.push('/stats')} accessibilityRole="link">See stats</Txt>
            </Txt>
          )}
          {tip.kind === 'setAside' && (
            <Txt size={13} color={colors.warningInk} style={styles.tipText}>
              Set aside {formatIDR(tip.amount)} for {tip.name} this month.{' '}
              <Txt w="extrabold" size={13} color={colors.green} onPress={() => router.push('/plans')} accessibilityRole="link">Plans</Txt>
            </Txt>
          )}
          {tip.kind === 'ok' && <Txt size={13} color={colors.warningInk} style={styles.tipText}>All on track this month. Nice!</Txt>}
        </View>
      </View>

      <SectionTitle
        title="Accounts"
        right={<Txt size={12} color={colors.muted}>Net worth <Txt size={12} w="bold">{formatIDR(netWorth)}</Txt></Txt>}
      />
      <Card style={{ marginHorizontal: 16, marginTop: 8 }}>
        {rows.length === 0 && <Row title="No accounts yet" subtitle="Add one in Settings → Accounts" last onPress={() => router.push('/settings')} />}
        {rows.map((r, i) => {
          const t = ACCOUNT_TYPES[r.account.type];
          const credit = r.account.type === 'credit';
          return (
            <Row
              key={r.account.id}
              last={i === rows.length - 1}
              onPress={() => router.push({ pathname: '/account/[id]', params: { id: r.account.id } })}
              label={`${r.account.name}, ${formatAmount(r.balance)}`}
              left={<IconCircle emoji={t.emoji} tint={t.tint} />}
              title={r.account.name}
              subtitle={r.overAllocatedBy > 0 ? `Over-allocated by ${formatAmount(r.overAllocatedBy)}` : r.subtitle}
              right={
                <View style={{ alignItems: 'flex-end' }}>
                  <Money value={r.balance} color={r.balance < 0 ? colors.red : colors.ink} />
                  {credit && r.balance < 0 && <Txt size={11} color={colors.muted}>owed</Txt>}
                </View>
              }
            />
          );
        })}
      </Card>
    </Screen>
  );
}

function Total({ label, value, color = colors.ink, divider }: { label: string; value: number; color?: string; divider?: boolean }) {
  return (
    <View style={[{ flex: 1 }, divider && styles.divider]}>
      <Txt size={12} w="semibold" color={colors.muted}>{label}</Txt>
      <Money value={value} size={15} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.accent, paddingHorizontal: 20, paddingBottom: 64 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  who: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.accent },
  gear: { width: 40, height: 40, borderRadius: radius.control, backgroundColor: colors.headerGlass },
  summary: {
    marginTop: -48, marginHorizontal: 16, backgroundColor: colors.card, borderRadius: radius.card, paddingVertical: 14, paddingHorizontal: 16, gap: 12,
    shadowColor: colors.ink, shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  totals: { flexDirection: 'row' },
  divider: { paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: colors.hairline },
  between: { flexDirection: 'row', justifyContent: 'space-between' },
  tip: { marginTop: 12, marginHorizontal: 16, backgroundColor: colors.warningSurface, borderRadius: radius.small, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipText: { lineHeight: 18 },
});
