import { View } from 'react-native';
import { todayJakarta } from '@/domain/dates';
import { formatAmount } from '@/domain/money';
import { Transaction } from '@/domain/types';
import { allAccounts, allPockets, recentlyDeleted, txRow } from '@/store/selectors';
import { Button, Card, IconCircle, PageHeader, Row, Screen, Txt, shortDate } from '@/ui/components';
import { useAppState, useStore } from '@/ui/StoreProvider';
import { colors } from '@/ui/theme';

/** Transactions deleted in the last 30 days, each with Restore. */
export default function RecentlyDeleted() {
  const store = useStore();
  const today = todayJakarta();
  const rows = useAppState((s) => recentlyDeleted(s, today).map((t) => txRow(s, t)));
  const deletedAccount = useAppState((s) => (id?: string) => allAccounts(s).find((a) => a.id === id && a.deletedAt));
  const deletedPockets = useAppState((s) => (accountId: string) => allPockets(s).filter((p) => p.accountId === accountId && p.deletedAt));

  // Deleting an account hides its transactions and pockets with it, so restoring one of them brings the account back too.
  const restore = (t: Transaction) =>
    store.batch((tx) => {
      for (const id of [t.accountId, t.toAccountId]) {
        const a = deletedAccount(id);
        if (!a) continue;
        tx.restore('account', a.id);
        for (const p of deletedPockets(a.id)) tx.restore('pocket', p.id);
      }
      tx.restore('transaction', t.id);
    });

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Recently deleted" />
      <Screen style={{ padding: 16, gap: 12 }}>
        <Txt size={12} color={colors.muted}>Transactions you deleted in the last 30 days.</Txt>
        {rows.length === 0 ? (
          <Txt color={colors.muted} style={{ textAlign: 'center', paddingVertical: 24 }}>Nothing deleted.</Txt>
        ) : (
          <Card>
            {rows.map((r, i) => (
              <Row
                key={r.tx.id}
                last={i === rows.length - 1}
                left={<IconCircle emoji={r.emoji} tint={r.tint} size={40} />}
                title={r.title}
                subtitle={`${formatAmount(r.tx.amount)} · ${shortDate(r.tx.date)} · deleted ${shortDate(todayJakarta(Date.parse(r.tx.deletedAt!)))}`}
                right={<Button title="Restore" small kind="secondary" onPress={() => restore(r.tx)} />}
              />
            ))}
          </Card>
        )}
      </Screen>
    </View>
  );
}
