import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Txt } from '@/ui/components';
import { Kasi } from '@/ui/kasi';
import { colors } from '@/ui/theme';

// Screenshot import is Plan 4; until then this tab points at manual entry.
export default function Scan() {
  return (
    <View style={styles.root}>
      <Kasi mood="thinking" size={96} />
      <Txt w="extrabold" size={18} style={styles.center}>Screenshot import is coming in the next update</Txt>
      <Txt color={colors.muted} style={styles.center}>Until then, add transactions by hand.</Txt>
      <Button title="Add manually" onPress={() => router.push('/tx/new')} style={{ alignSelf: 'stretch' }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 14, backgroundColor: colors.bg },
  center: { textAlign: 'center' },
});
