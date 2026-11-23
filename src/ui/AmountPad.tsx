import { Pressable, StyleSheet, View } from 'react-native';
import { Txt } from './components';
import { BackspaceIcon } from './icons';
import { colors, radius } from './theme';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del'] as const;
const MAX_DIGITS = 13; // up to Rp 9.999.999.999.999

/** Number keys only; the value is whole rupiah as a digit string. */
export function AmountPad({ value, onChange }: { value: string; onChange: (digits: string) => void }) {
  const press = (k: (typeof KEYS)[number]) => {
    if (k === 'del') return onChange(value.slice(0, -1));
    const next = (value + k).replace(/^0+/, '');
    if (next.length <= MAX_DIGITS) onChange(next);
  };
  return (
    <View style={styles.grid}>
      {KEYS.map((k) => (
        <Pressable
          key={k}
          onPress={() => press(k)}
          onLongPress={k === 'del' ? () => onChange('') : undefined}
          accessibilityRole="button"
          accessibilityLabel={k === 'del' ? 'Delete digit' : k}
          style={({ pressed }) => [styles.key, pressed && styles.pressed]}
        >
          {k === 'del' ? <BackspaceIcon /> : <Txt w="bold" size={22}>{k}</Txt>}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  key: { width: '31.5%', flexGrow: 1, height: 52, borderRadius: radius.control, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  pressed: { backgroundColor: colors.segment },
});
