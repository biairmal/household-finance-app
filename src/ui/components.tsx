import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextInputProps, TextProps, TextStyle, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatAmount, formatIDR } from '../domain/money';
import { ChevronLeft, ChevronRight } from './icons';
import { Tint, colors, font, radius, tabular } from './theme';

type Weight = keyof typeof font;

/** Back, or Home when the page was opened directly (a reload or a deep link has no history). */
export const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

export function Txt({ w = 'regular', size = 14, color = colors.ink, style, ...rest }: TextProps & { w?: Weight; size?: number; color?: string }) {
  return <Text {...rest} style={[{ fontFamily: font[w], fontSize: size, color }, tabular, style]} />;
}

/** A scrolling page on the app background. `pad` adds the bottom room a tab bar or a FAB needs. */
export function Screen({ children, pad = 24, style, scroll = true }: { children: ReactNode; pad?: number; style?: StyleProp<ViewStyle>; scroll?: boolean }) {
  if (!scroll) return <View style={[styles.screen, style]}>{children}</View>;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={[{ paddingBottom: pad }, style]} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

/** Page title bar with a back button, for screens outside the tabs. */
export function PageHeader({ title, right }: { title: string; right?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.pageHeader, { paddingTop: insets.top + 4 }]}>
      <IconButton label="Back" onPress={goBack}>
        <ChevronLeft />
      </IconButton>
      <Txt w="extrabold" size={17} style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </Txt>
      {right}
    </View>
  );
}

export function IconButton({ label, onPress, children, style }: { label: string; onPress: () => void; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4} style={({ pressed }) => [styles.iconButton, style, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** A list row inside a card: leading icon, title and subtitle, trailing content, hairline below unless `last`. */
export function Row({ left, title, subtitle, right, last, onPress, label }: {
  left?: ReactNode; title: ReactNode; subtitle?: ReactNode; right?: ReactNode; last?: boolean; onPress?: () => void; label?: string;
}) {
  const body = (
    <>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof title === 'string' ? <Txt w="bold" numberOfLines={1}>{title}</Txt> : title}
        {subtitle ? typeof subtitle === 'string' ? <Txt size={12} color={colors.muted} numberOfLines={1}>{subtitle}</Txt> : subtitle : null}
      </View>
      {right}
    </>
  );
  const style = [styles.row, !last && styles.rowLine];
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [style, pressed && styles.pressed]}>
      {body}
    </Pressable>
  ) : (
    <View style={style}>{body}</View>
  );
}

export function IconCircle({ emoji, tint = 'green', size = 42, bg }: { emoji: string; tint?: Tint; size?: number; bg?: string }) {
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg ?? colors.tints[tint] }]}>
      <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
    </View>
  );
}

/** List amounts without "Rp"; `rp` for headline figures. */
export function Money({ value, rp, color, size = 14, w = 'extrabold', style }: { value: number; rp?: boolean; color?: string; size?: number; w?: Weight; style?: StyleProp<TextStyle> }) {
  return (
    <Txt w={w} size={size} color={color} style={style}>
      {rp ? formatIDR(value) : formatAmount(value)}
    </Txt>
  );
}

export function ProgressBar({ ratio, color = colors.accent, height = 8, track = colors.hairline }: { ratio: number; color?: string; height?: number; track?: string }) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 1)) * 100;
  return (
    <View style={{ height, backgroundColor: track, borderRadius: height / 2, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height, backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

/** Budget colour: green, amber at 80%, red over 100%. */
export const statusColor = (status: 'ok' | 'warning' | 'over') => (status === 'over' ? colors.redStrong : status === 'warning' ? colors.orange : colors.accent);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthName = (key: string, short = false) => {
  const name = MONTHS[Number(key.slice(5, 7)) - 1];
  return `${short ? name.slice(0, 3) : name} ${key.slice(0, 4)}`;
};
/** "1 Dec" from a YYYY-MM-DD date. */
export const shortDate = (date: string) => `${Number(date.slice(8))} ${MONTHS[Number(date.slice(5, 7)) - 1].slice(0, 3)}`;

export function MonthStepper({ label, onPrev, onNext, variant = 'soft' }: { label: string; onPrev: () => void; onNext: () => void; variant?: 'soft' | 'plain' }) {
  const btn = variant === 'soft' ? styles.stepSoft : undefined;
  return (
    <View style={styles.stepper}>
      <IconButton label="Previous" onPress={onPrev} style={btn}>
        <ChevronLeft size={18} />
      </IconButton>
      <Txt w="extrabold" size={variant === 'soft' ? 15 : 16}>{label}</Txt>
      <IconButton label="Next" onPress={onNext} style={btn}>
        <ChevronRight size={18} />
      </IconButton>
    </View>
  );
}

export function Button({ title, onPress, kind = 'primary', disabled, style, small }: {
  title: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger' | 'ghost'; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean;
}) {
  const bg = { primary: colors.accent, secondary: colors.segment, danger: colors.redStrong, ghost: 'transparent' }[kind];
  const fg = kind === 'primary' || kind === 'danger' ? colors.white : kind === 'ghost' ? colors.green : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={small ? 4 : undefined}
      onPress={onPress}
      style={({ pressed }) => [styles.button, small && styles.buttonSmall, { backgroundColor: bg }, disabled && styles.disabled, pressed && styles.pressed, style]}
    >
      <Txt w="extrabold" size={small ? 13 : 15} color={fg}>{title}</Txt>
    </Pressable>
  );
}

export function SectionTitle({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.section}>
      <Txt w="extrabold" size={16} accessibilityRole="header">{title}</Txt>
      {right}
    </View>
  );
}

export function Pill({ text, color, bg }: { text: string; color: string; bg: string }) {
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Txt w="bold" size={12} color={color}>{text}</Txt>
    </View>
  );
}

/** A labelled text input for forms. */
export function Field({ label, error, hint, style, ...rest }: TextInputProps & { label: string; error?: boolean; hint?: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Txt size={12} w="bold" color={colors.muted}>{label}</Txt>
      <TextInput accessibilityLabel={label} placeholderTextColor={colors.muted} {...rest} style={[styles.input, error && styles.bad, style]} />
      {hint}
    </View>
  );
}

/** A rupiah amount typed as digits and shown grouped (20.000.000). */
export function AmountField({ value, onAmount, ...rest }: Omit<TextInputProps, 'value'> & { label: string; value: number; onAmount: (n: number) => void; error?: boolean; hint?: ReactNode }) {
  return (
    <Field {...rest} keyboardType="number-pad" value={value ? formatAmount(value) : ''} onChangeText={(t) => onAmount(Number(t.replace(/\D/g, '').slice(0, 15)) || 0)} placeholder="0" />
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pageHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingBottom: 6, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.chip },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.4 },
  card: { backgroundColor: colors.card, borderRadius: radius.card, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 44 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.hairline },
  circle: { alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepSoft: { width: 36, height: 36, backgroundColor: colors.bg },
  button: { height: 48, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  buttonSmall: { height: 36, borderRadius: radius.chip, paddingHorizontal: 12 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginHorizontal: 16, marginTop: 18 },
  input: { height: 48, borderRadius: radius.control, backgroundColor: colors.card, paddingHorizontal: 14, fontFamily: font.semibold, fontSize: 15, color: colors.ink, borderWidth: 1, borderColor: colors.border },
  bad: { borderColor: colors.red, color: colors.red },
});
