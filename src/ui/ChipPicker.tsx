import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { Txt } from './components';
import { colors, radius } from './theme';

export type Chip = { id: string; label: string; emoji?: string };

/** A horizontal row of selectable chips. */
export function ChipPicker({ chips, value, onChange, label, wrap }: { chips: Chip[]; value?: string | null; onChange: (id: string) => void; label: string; wrap?: boolean }) {
  const items = chips.map((c) => {
    const on = c.id === value;
    return (
      <Pressable
        key={c.id}
        onPress={() => onChange(c.id)}
        accessibilityRole="radio"
        accessibilityState={{ checked: on }}
        accessibilityLabel={c.label}
        style={[styles.chip, on && styles.on]}
      >
        {c.emoji ? <Text style={styles.emoji}>{c.emoji}</Text> : null}
        <Txt w="bold" size={13} color={on ? colors.white : colors.ink} numberOfLines={1}>{c.label}</Txt>
      </Pressable>
    );
  });
  if (wrap) return <ScrollView contentContainerStyle={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel={label} scrollEnabled={false}>{items}</ScrollView>;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {items}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 16 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: 12, borderRadius: radius.chip, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  on: { backgroundColor: colors.accent, borderColor: colors.accent },
  emoji: { fontSize: 16 },
});
