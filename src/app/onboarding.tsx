import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { defaultCategories } from '@/domain/defaults';
import { Button, Txt } from '@/ui/components';
import { Kasi } from '@/ui/kasi';
import { useOnboarding, useStore } from '@/ui/StoreProvider';
import { colors, font, radius } from '@/ui/theme';

export default function Onboarding() {
  const store = useStore();
  const { onboarded, setOnboarded } = useOnboarding();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (onboarded) return <Redirect href="/" />;

  const start = async (seed: () => Promise<void>, then: '/settings' | '/') => {
    setBusy(true);
    setError(null);
    try {
      if (!store.memberId) await store.setMember(name);
      await seed();
      await setOnboarded();
      router.replace(then);
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  };
  const startEmpty = () =>
    start(() => store.batch((tx) => defaultCategories().forEach((c) => tx.create('category', c))), '/settings');

  const ready = name.trim().length > 0 && !busy;
  return (
    <View style={[styles.root, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}>
      <Kasi mood="happy" size={88} />
      <Txt w="extrabold" size={24} accessibilityRole="header">Welcome to Household Money</Txt>
      <Txt color={colors.muted}>Everything stays on this phone for now. What should we call you?</Txt>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={colors.muted}
        accessibilityLabel="Your name"
        autoFocus
        maxLength={40}
        style={styles.input}
      />
      <View style={{ flex: 1 }} />
      {error && <Txt color={colors.red}>{error}</Txt>}
      <Button title="Start empty" onPress={startEmpty} disabled={!ready} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, gap: 14, backgroundColor: colors.bg },
  input: {
    height: 52, borderRadius: radius.control, backgroundColor: colors.card, paddingHorizontal: 14,
    fontFamily: font.semibold, fontSize: 16, color: colors.ink, borderWidth: 1, borderColor: colors.border,
  },
});
