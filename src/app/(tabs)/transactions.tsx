import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addMonthsToKey, monthOf, todayJakarta } from '@/domain/dates';
import { formatAmount, formatCompact } from '@/domain/money';
import { calendarMonth, categorySpend, dayGroups, homeSummary, monthTotals } from '@/store/selectors';
import { Button, Card, IconButton, IconCircle, Money, Row, Txt, monthName } from '@/ui/components';
import { ChevronLeft, ChevronRight, CloseIcon, PlusIcon, SearchIcon } from '@/ui/icons';
import { Kasi } from '@/ui/kasi';
import { Segmented } from '@/ui/Segmented';
import { useAppState } from '@/ui/StoreProvider';
import { colors, font, radius } from '@/ui/theme';
import { DayCard } from '@/ui/TxRows';

type View_ = 'daily' | 'calendar' | 'monthly' | 'summary';

export default function Transactions() {
  const insets = useSafeAreaInsets();
  const today = todayJakarta();
  const [month, setMonth] = useState(monthOf(today));
  const [view, setView] = useState<View_>('daily');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const list = useRef<FlatList>(null);

  const totals = useAppState((s) => homeSummary(s, month));
  const groups = useAppState((s) => dayGroups(s, month, searching ? query : undefined));

  const jumpTo = (date: string) => {
    setView('daily');
    const index = groups.findIndex((g) => g.date === date);
    if (index >= 0) setTimeout(() => list.current?.scrollToIndex({ index, animated: true }), 50);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headRow}>
          <IconButton label="Previous month" onPress={() => setMonth(addMonthsToKey(month, view === 'monthly' ? -12 : -1))}>
            <ChevronLeft />
          </IconButton>
          <Txt w="extrabold" size={16}>{view === 'monthly' ? month.slice(0, 4) : monthName(month, true)}</Txt>
          <View style={{ flexDirection: 'row' }}>
            <IconButton label="Next month" onPress={() => setMonth(addMonthsToKey(month, view === 'monthly' ? 12 : 1))}>
              <ChevronRight />
            </IconButton>
            <IconButton label={searching ? 'Close search' : 'Search'} onPress={() => { setSearching(!searching); setQuery(''); }}>
              {searching ? <CloseIcon /> : <SearchIcon />}
            </IconButton>
          </View>
        </View>
        {searching && (
          <TextInput
            value={query}
            onChangeText={(q) => { setQuery(q); setView('daily'); }}
            placeholder="Search note, payee, category, account"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Search transactions"
            autoFocus
            style={styles.search}
          />
        )}
        <View style={{ marginHorizontal: 4 }}>
          <Segmented
            label="View"
            value={view}
            onChange={setView}
            options={[{ value: 'daily', label: 'Daily' }, { value: 'calendar', label: 'Calendar' }, { value: 'monthly', label: 'Monthly' }, { value: 'summary', label: 'Summary' }]}
          />
        </View>
        <View style={styles.totals}>
          <Total label="Income" value={totals.income} color={colors.green} />
          <Total label="Expense" value={totals.expense} color={colors.red} />
          <Total label="Total" value={totals.net} />
        </View>
      </View>

      {view === 'daily' && (
        <FlatList
          ref={list}
          data={groups}
          keyExtractor={(g) => g.date}
          contentContainerStyle={styles.listBody}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => <DayCard group={item} today={today} />}
          onScrollToIndexFailed={({ index, averageItemLength }) => list.current?.scrollToOffset({ offset: index * averageItemLength, animated: true })}
          initialNumToRender={31} // at most one card per day, so calendar jumps can always reach the measured card
          ListEmptyComponent={
            <View style={styles.empty}>
              <Kasi mood="thinking" size={72} />
              <Txt w="bold" style={{ textAlign: 'center' }}>
                {searching && query ? `Nothing matches "${query}" in ${monthName(month)}` : `Nothing logged in ${monthName(month).split(' ')[0]} yet`}
              </Txt>
              {!(searching && query) && <Button title="Add" onPress={() => router.push('/tx/new')} small />}
            </View>
          }
        />
      )}
      {view === 'calendar' && <Calendar month={month} today={today} onPick={jumpTo} />}
      {view === 'monthly' && (
        <MonthlyList
          year={month.slice(0, 4)}
          onPick={(m) => { setMonth(m); setView('daily'); }}
        />
      )}
      {view === 'summary' && <Summary month={month} />}

      <Pressable accessibilityRole="button" accessibilityLabel="Add transaction" onPress={() => router.push('/tx/new')} style={({ pressed }) => [styles.fab, pressed && { opacity: 0.8 }]}>
        <PlusIcon color={colors.white} />
      </Pressable>
    </View>
  );
}

function Total({ label, value, color = colors.ink }: { label: string; value: number; color?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Txt size={11} w="semibold" color={colors.muted}>{label}</Txt>
      <Money value={value} color={color} />
    </View>
  );
}

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function Calendar({ month, today, onPick }: { month: string; today: string; onPick: (date: string) => void }) {
  const days = useAppState((s) => calendarMonth(s, month));
  const [y, m] = month.split('-').map(Number);
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday first
  const cells: (typeof days[number] | null)[] = [...Array(lead).fill(null), ...days];
  while (cells.length % 7) cells.push(null);
  return (
    <ScrollView contentContainerStyle={styles.listBody}>
      <Card style={{ paddingHorizontal: 6, paddingVertical: 8 }}>
        <View style={styles.week}>
          {WEEK.map((d) => <Txt key={d} size={11} w="bold" color={colors.muted} style={styles.weekDay}>{d}</Txt>)}
        </View>
        <View style={styles.grid}>
          {cells.map((c, i) =>
            c ? (
              <Pressable
                key={c.date}
                onPress={() => onPick(c.date)}
                accessibilityRole="button"
                accessibilityLabel={`${Number(c.date.slice(8))}: income ${formatAmount(c.income)}, expense ${formatAmount(c.expense)}`}
                style={[styles.cell, c.date === today && styles.cellToday]}
              >
                <Txt w="bold" size={13}>{Number(c.date.slice(8))}</Txt>
                {c.income > 0 && <Txt size={10} color={colors.green} numberOfLines={1}>{formatCompact(c.income)}</Txt>}
                {c.expense > 0 && <Txt size={10} color={colors.red} numberOfLines={1}>{formatCompact(c.expense)}</Txt>}
              </Pressable>
            ) : (
              <View key={`e${i}`} style={styles.cell} />
            ),
          )}
        </View>
      </Card>
    </ScrollView>
  );
}

function MonthlyList({ year, onPick }: { year: string; onPick: (monthKey: string) => void }) {
  const rows = useAppState((s) => monthTotals(s, year));
  return (
    <ScrollView contentContainerStyle={styles.listBody}>
      <Card>
        {rows.map((r, i) => (
          <Row
            key={r.monthKey}
            last={i === rows.length - 1}
            onPress={() => onPick(r.monthKey)}
            label={`${monthName(r.monthKey)}: income ${formatAmount(r.income)}, expense ${formatAmount(r.expense)}`}
            title={monthName(r.monthKey).split(' ')[0]}
            subtitle={
              <Txt size={12} color={colors.muted}>
                <Txt size={12} color={colors.green}>{formatAmount(r.income)}</Txt> · <Txt size={12} color={colors.red}>{formatAmount(r.expense)}</Txt>
              </Txt>
            }
            right={<Money value={r.net} color={r.net < 0 ? colors.red : colors.ink} />}
          />
        ))}
      </Card>
    </ScrollView>
  );
}

function Summary({ month }: { month: string }) {
  const expense = useAppState((s) => categorySpend(s, 'month', month, 'expense'));
  const income = useAppState((s) => categorySpend(s, 'month', month, 'income'));
  const section = (title: string, rows: typeof expense, color: string) => (
    <View style={{ gap: 8 }}>
      <Txt w="extrabold" size={16} accessibilityRole="header">{title}</Txt>
      <Card>
        {rows.length === 0 && <Row title="Nothing yet" last />}
        {rows.map((r, i) => (
          <Row
            key={r.category.id || 'none'}
            last={i === rows.length - 1}
            left={<IconCircle emoji={r.category.emoji} size={36} />}
            title={r.category.name}
            subtitle={`${Math.round(r.share * 100)}%`}
            right={<Money value={r.amount} color={color} />}
          />
        ))}
      </Card>
    </View>
  );
  return (
    <ScrollView contentContainerStyle={[styles.listBody, { gap: 16 }]}>
      {section('Expense', expense, colors.ink)}
      {section('Income', income, colors.green)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.card, paddingHorizontal: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  search: {
    marginHorizontal: 4, height: 44, borderRadius: radius.control, backgroundColor: colors.segment, paddingHorizontal: 12,
    fontFamily: font.semibold, fontSize: 14, color: colors.ink,
  },
  totals: { flexDirection: 'row', marginHorizontal: 4 },
  listBody: { padding: 16, paddingBottom: 100 },
  empty: { alignItems: 'center', gap: 12, paddingTop: 48, paddingHorizontal: 24 },
  fab: {
    position: 'absolute', right: 18, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.redStrong, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.redStrong, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  week: { flexDirection: 'row' },
  weekDay: { width: `${100 / 7}%`, textAlign: 'center', paddingVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, minHeight: 56, alignItems: 'center', paddingVertical: 4, borderRadius: radius.chip },
  cellToday: { backgroundColor: colors.successSurface },
});
