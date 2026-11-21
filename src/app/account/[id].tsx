import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { accountOf } from '@/store/selectors';
import { PageHeader } from '@/ui/components';
import { useAppState } from '@/ui/StoreProvider';

// Filled in by Task 8 (account detail).
export default function AccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const account = useAppState((s) => accountOf(s, id));
  return (
    <View style={{ flex: 1 }}>
      <PageHeader title={account?.name ?? 'Account'} />
    </View>
  );
}
