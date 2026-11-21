import { router } from 'expo-router';
import { View } from 'react-native';
import { Card, IconCircle, PageHeader, Row, Screen } from '@/ui/components';
import { ChevronRight } from '@/ui/icons';
import { colors } from '@/ui/theme';

export default function Settings() {
  return (
    <View style={{ flex: 1 }}>
      <PageHeader title="Settings" />
      <Screen style={{ padding: 16 }}>
        <Card>
          <Row left={<IconCircle emoji="🏦" tint="blue" size={36} />} title="Accounts" onPress={() => router.push('/settings/accounts')} right={<ChevronRight color={colors.muted} size={18} />} />
          <Row left={<IconCircle emoji="🗂️" tint="yellow" size={36} />} title="Categories" onPress={() => router.push('/settings/categories')} right={<ChevronRight color={colors.muted} size={18} />} />
          <Row left={<IconCircle emoji="🎯" tint="green" size={36} />} title="Budgets" onPress={() => router.push('/settings/budgets')} right={<ChevronRight color={colors.muted} size={18} />} />
          <Row left={<IconCircle emoji="🛠️" tint="blue" size={36} />} title="Developer" last onPress={() => router.push('/settings/developer')} right={<ChevronRight color={colors.muted} size={18} />} />
        </Card>
      </Screen>
    </View>
  );
}
