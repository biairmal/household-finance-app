import { Pressable, StyleSheet, View } from 'react-native';
import { Txt } from './components';
import { colors, radius } from './theme';

/** The grey pill switch from the v5 mockups (Daily / Calendar …, Expense / Income). */
export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <View style={styles.root} accessibilityRole="tablist" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="tab" accessibilityState={{ selected: on }} style={[styles.item, on && styles.on]}>
            <Txt w="bold" size={13} color={on ? colors.ink : colors.muted} numberOfLines={1}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', backgroundColor: colors.segment, borderRadius: radius.control, padding: 3 },
  item: { flex: 1, minHeight: 36, borderRadius: radius.chip, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  on: { backgroundColor: colors.card, shadowColor: colors.ink, shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
});
