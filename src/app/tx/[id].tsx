import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { memberOf } from '@/store/selectors';
import { Button, goBack, PageHeader, Txt } from '@/ui/components';
import { confirm } from '@/ui/confirm';
import { useAppState, useStore } from '@/ui/StoreProvider';
import { colors } from '@/ui/theme';
import { TxForm } from '@/ui/TxForm';
import { Transaction } from '@/domain/types';

const FIELDS = ['type', 'amount', 'date', 'time', 'accountId', 'toAccountId', 'categoryId', 'pocketId', 'note', 'counterpartyName'] as const;

export default function EditTransaction() {
  const store = useStore();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tx = useAppState((s) => s.transaction[id] as unknown as Transaction | undefined);
  const editor = useAppState((s) => memberOf(s, tx?.updatedBy)?.name);

  if (!tx || tx.deletedAt) {
    return (
      <View style={{ flex: 1 }}>
        <PageHeader title="Transaction" />
        <Txt color={colors.muted} style={{ padding: 16 }}>This transaction was deleted. You can restore it from Settings → Recently deleted.</Txt>
      </View>
    );
  }

  const remove = async () => {
    if (!(await confirm('Delete this transaction?', 'You can restore it for 30 days.', 'Delete', true))) return;
    await store.remove('transaction', tx.id);
    goBack();
  };

  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Edit transaction" />
      <TxForm
        key={tx.id}
        initial={tx}
        editingId={tx.id}
        onSave={async (v) => {
          // Cleared fields become null so the change survives the SQLite round trip; the store writes only what changed.
          const patch = Object.fromEntries(FIELDS.map((f) => [f, v[f] ?? null]));
          const current = Object.fromEntries(FIELDS.map((f) => [f, tx[f] ?? null]));
          await store.update('transaction', tx.id, Object.fromEntries(Object.entries(patch).filter(([k, val]) => JSON.stringify(val) !== JSON.stringify(current[k]))));
          goBack();
        }}
        footer={
          <View style={{ paddingHorizontal: 16, gap: 8 }}>
            <Txt size={12} color={colors.muted}>
              {tx.source === 'screenshot' ? '📸 Imported from a screenshot · ' : ''}Last edited by {editor ?? 'someone'}
            </Txt>
            <Button title="Delete" kind="ghost" onPress={remove} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} />
          </View>
        }
      />
    </View>
  );
}
