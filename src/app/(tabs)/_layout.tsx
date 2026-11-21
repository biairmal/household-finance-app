import { Redirect, Tabs } from 'expo-router';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '@/ui/components';
import { HomeIcon, ListIcon, PieIcon, ScanIcon, TargetIcon } from '@/ui/icons';
import { useOnboarding } from '@/ui/StoreProvider';
import { colors } from '@/ui/theme';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: Record<string, { label: string; Icon: typeof HomeIcon }> = {
  index: { label: 'Home', Icon: HomeIcon },
  transactions: { label: 'Transactions', Icon: ListIcon },
  stats: { label: 'Stats', Icon: PieIcon },
  plans: { label: 'Plans', Icon: TargetIcon },
};

/** The v5 nav: 80 px, active tab green and extra-bold, Scan as the raised green centre button. */
function TabBar({ state, emitter, navigateToTab }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { height: 80 + insets.bottom, paddingBottom: insets.bottom }]} accessibilityRole="tablist">
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        const press = () => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigateToTab(route.key);
        };
        if (route.name === 'scan') {
          return (
            <Pressable key={route.key} onPress={press} accessibilityRole="tab" accessibilityLabel="Scan screenshot" accessibilityState={{ selected: focused }} style={styles.scanCell}>
              <View style={styles.scan}>
                <ScanIcon color={colors.white} />
              </View>
            </Pressable>
          );
        }
        const tab = TABS[route.name];
        if (!tab) return null;
        return (
          <Pressable key={route.key} onPress={press} accessibilityRole="tab" accessibilityState={{ selected: focused }} style={styles.cell}>
            <tab.Icon color={focused ? colors.accent : colors.navMuted} strokeWidth={focused ? 2.2 : 1.8} />
            <Txt size={11} w={focused ? 'extrabold' : 'semibold'} color={focused ? colors.green : colors.navMuted}>
              {tab.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { onboarded } = useOnboarding();
  if (!onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="transactions" />
      <Tabs.Screen name="scan" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="plans" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 8, paddingHorizontal: 8, backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border },
  cell: { flex: 1, alignItems: 'center', gap: 4, minHeight: 44 },
  scanCell: { flex: 1, alignItems: 'center', minHeight: 44 },
  scan: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: -14,
    shadowColor: colors.accent, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
});
