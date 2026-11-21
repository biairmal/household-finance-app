// Every colour the app uses. Screens import from here, never hex values, so dark mode (Plan 6) touches only this file.
export const colors = {
  bg: '#F4F6F5',
  card: '#FFFFFF',
  hairline: '#EEF1EF',
  border: '#E7EBE9',
  ink: '#1A1D1C',
  muted: '#5B6360',
  navMuted: '#6A726F',
  accent: '#0A9F5A',
  green: '#0A8A4E',
  red: '#D13A40',
  redStrong: '#E5484D',
  amber: '#E6A700',
  amberText: '#9A5200',
  orange: '#F2760F',
  orangeSoft: '#F2A15A',
  purple: '#7C4DDB',
  blue: '#2E6BE6',
  white: '#FFFFFF',
  segment: '#F0F3F1',
  warningSurface: '#FFF8E1',
  warningInk: '#3F3A2A',
  dangerSurface: '#FFF0F0',
  dangerInk: '#4A2326',
  dangerDeep: '#8E2A30',
  overdueText: '#C2313A',
  successSurface: '#E3F5EC',
  headerGlass: 'rgba(255,255,255,0.16)',
  shadow: 'rgba(16,24,20,0.08)',
  wife: '#FFD54F',
  wifeInk: '#6B4A00',
  kasi: { light: '#FFE873', mid: '#FFCB2E', edge: '#F5A900', line: '#4A2F1A', cheek: '#FF8A65', hand: '#FFD84A', handEdge: '#F2A500', handStroke: '#E09A00', star: '#FFB02E', starEdge: '#F26B1D', tongue: '#F0645F', sweat: '#5E8BFF', sweatLight: '#8FB0FF' },
  scrim: 'rgba(16,24,20,0.4)',
  tints: {
    blue: '#EAF0FD',
    pink: '#FDEFF6',
    green: '#E3F5EC',
    red: '#FDE8E8',
    yellow: '#FFF8E1',
    orange: '#FFF1DF',
  },
} as const;

export type Tint = keyof typeof colors.tints;

/** Category colours for the donut and share badges, in the mockup's order. */
export const chartColors = [colors.accent, colors.purple, colors.redStrong, colors.amber, colors.orange, colors.blue, colors.orangeSoft, colors.muted];

export const radius = { card: 16, small: 14, control: 12, chip: 10 } as const;

export const font = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 } as const;

/** Tabular figures so amounts line up. */
export const tabular = { fontVariant: ['tabular-nums' as const] };
