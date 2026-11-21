import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Txt } from './components';
import { colors, radius } from './theme';

export const EMOJI = [
  '🛒', '🍜', '☕', '⛽', '🚗', '🛵', '🏠', '💡', '💧', '📱', '💊', '🏥', '🎓', '📚', '🛍️', '👕', '👪', '👶', '🤲', '🎬',
  '🎮', '📺', '🎵', '✈️', '🏖️', '🎁', '🐶', '💇', '🧾', '🏦', '💳', '📦', '🔧', '🧹', '⚽', '💼', '💰', '🧑‍💻', '📈', '➕',
];

/** A fixed grid of about 40 emoji, so no emoji keyboard is needed. */
export function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Txt size={12} w="bold" color={colors.muted}>Icon</Txt>
      <View style={styles.grid} accessibilityRole="radiogroup" accessibilityLabel="Icon">
        {EMOJI.map((e) => (
          <Pressable key={e} onPress={() => onChange(e)} accessibilityRole="radio" accessibilityState={{ checked: e === value }} accessibilityLabel={e} style={[styles.emoji, e === value && styles.on]}>
            <Text style={{ fontSize: 22 }}>{e}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  emoji: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.chip },
  on: { backgroundColor: colors.successSurface, borderWidth: 2, borderColor: colors.accent },
});
