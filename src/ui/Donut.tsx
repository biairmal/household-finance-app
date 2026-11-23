import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { colors, font } from './theme';

const R = 50;
const C = 2 * Math.PI * R;

/** The v5 Stats donut: one arc per share (0–1), in order, with a two-line label in the middle. */
export function Donut({ shares, palette, label, value, size = 132, a11y }: { shares: number[]; palette: readonly string[]; label: string; value: string; size?: number; a11y: string }) {
  const offsets = shares.map((_, i) => shares.slice(0, i).reduce((a, b) => a + b, 0) * C);
  return (
    <Svg width={size} height={size} viewBox="0 0 132 132" accessibilityRole="image" accessibilityLabel={a11y}>
      {/* A circle stroke starts at 3 o'clock; the extra quarter-turn offset starts it at 12 without a transform. */}
        <Circle cx={66} cy={66} r={R} stroke={colors.hairline} strokeWidth={22} fill="none" />
        {shares.map((share, i) => (
            <Circle
              key={i}
              cx={66}
              cy={66}
              r={R}
              fill="none"
              stroke={palette[i % palette.length]}
              strokeWidth={22}
              strokeDasharray={`${Math.max(0, share * C - 1)} ${C - Math.max(0, share * C - 1)}`}
              strokeDashoffset={C / 4 - offsets[i]}
            />
        ))}
      <SvgText x={66} y={62} textAnchor="middle" fontSize={11} fontFamily={font.semibold} fill={colors.muted}>{label}</SvgText>
      <SvgText x={66} y={80} textAnchor="middle" fontSize={16} fontFamily={font.extrabold} fill={colors.ink}>{value}</SvgText>
    </Svg>
  );
}
