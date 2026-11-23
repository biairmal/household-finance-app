import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { TxType } from '@/domain/types';
import { goBack, PageHeader } from '@/ui/components';
import { useStore } from '@/ui/StoreProvider';
import { TxForm } from '@/ui/TxForm';

/** New transaction. Optional params prefill it (Plans uses them for a set-aside transfer). */
export default function NewTransaction() {
  const store = useStore();
  const p = useLocalSearchParams<{ type?: TxType; amount?: string; from?: string; to?: string; categoryId?: string; note?: string; date?: string }>();
  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="New transaction" />
      <TxForm
        initial={{ type: p.type, amount: p.amount ? Number(p.amount) : undefined, accountId: p.from, toAccountId: p.to, categoryId: p.categoryId, note: p.note, date: p.date }}
        onSave={async (v) => {
          await store.create('transaction', { ...v, source: 'manual', authorId: store.memberId ?? store.deviceId });
          goBack();
        }}
      />
    </View>
  );
}
