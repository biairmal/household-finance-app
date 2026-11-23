import { router } from 'expo-router';
import { View } from 'react-native';
import { ACCOUNT_TYPES, accountRows } from '@/store/selectors';
import { Button, Card, IconCircle, Money, PageHeader, Row, Screen, Txt } from '@/ui/components';
import { Kasi } from '@/ui/kasi';
import { useAppState } from '@/ui/StoreProvider';
import { colors } from '@/ui/theme';

export default function Accounts() {
  const { rows, netWorth } = useAppState(accountRows);
  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Accounts" />
      <Screen style={{ padding: 16, gap: 12 }}>
        {rows.length === 0 ? (
          <View style={{ alignItems: 'center', gap: 12, paddingVertical: 32 }}>
            <Kasi mood="thinking" size={72} />
            <Txt w="bold">Add the accounts you pay from first.</Txt>
          </View>
        ) : (
          <>
            <Txt size={13} color={colors.muted}>Net worth Rp {netWorth.toLocaleString('id-ID')}</Txt>
            <Card>
              {rows.map((r, i) => (
                <Row
                  key={r.account.id}
                  last={i === rows.length - 1}
                  onPress={() => router.push({ pathname: '/account/[id]', params: { id: r.account.id } })}
                  label={`${r.account.name}, ${r.subtitle}`}
                  left={<IconCircle emoji={ACCOUNT_TYPES[r.account.type].emoji} tint={ACCOUNT_TYPES[r.account.type].tint} />}
                  title={r.account.name}
                  subtitle={r.subtitle}
                  right={<Money value={r.balance} color={r.balance < 0 ? colors.red : colors.ink} />}
                />
              ))}
            </Card>
          </>
        )}
        <Button title="Add account" onPress={() => router.push('/account/edit')} />
      </Screen>
    </View>
  );
}
