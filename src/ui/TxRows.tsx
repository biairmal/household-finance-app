import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { formatAmount } from '../domain/money';
import { TxRow } from '../store/selectors';
import { Card, IconCircle, Row, Txt } from './components';
import { colors } from './theme';

type Group = { date: string; weekday: string; dayNet: number; rows: TxRow[] };

/** A day card from the v5 Transactions list: big date, weekday pill (dark for today), day net, rows. */
export function DayCard({ group, today }: { group: Group; today: string }) {
  const isToday = group.date === today;
  return (
    <Card>
      <View style={styles.head}>
        <Txt w="extrabold" size={22}>{Number(group.date.slice(8))}</Txt>
        <View style={[styles.pill, isToday && styles.pillToday]}>
          <Txt w="bold" size={11} color={isToday ? colors.white : colors.ink}>{group.weekday}</Txt>
        </View>
        <View style={{ flex: 1 }} />
        {group.dayNet !== 0 && (
          <Txt w="bold" size={13} color={group.dayNet < 0 ? colors.red : colors.green}>{formatAmount(Math.abs(group.dayNet))}</Txt>
        )}
      </View>
      {group.rows.map((r, i) => (
        <TxRowView key={r.tx.id} row={r} last={i === group.rows.length - 1} />
      ))}
    </Card>
  );
}

export function TxRowView({ row, last }: { row: TxRow; last?: boolean }) {
  const color = row.tx.type === 'income' ? colors.green : row.tx.type === 'transfer' ? colors.muted : colors.ink;
  return (
    <Row
      last={last}
      onPress={() => router.push({ pathname: '/tx/[id]', params: { id: row.tx.id } })}
      label={`${row.title}, ${row.tx.type}, ${formatAmount(row.tx.amount)}`}
      left={<IconCircle emoji={row.emoji} tint={row.tint} size={40} />}
      title={
        <Txt w="bold" numberOfLines={1}>
          {row.title}
          {row.fromScreenshot ? <Txt size={11}> 📸</Txt> : null}
        </Txt>
      }
      subtitle={row.subtitle}
      right={<Txt w="bold" color={color}>{formatAmount(row.tx.amount)}</Txt>}
    />
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.hairline },
  pill: { backgroundColor: colors.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  pillToday: { backgroundColor: colors.ink },
});
