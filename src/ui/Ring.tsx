import Svg, { Circle, Text as SvgText } from 'react-native-svg';
import { colors, font } from './theme';

const R = 23;
const C = 2 * Math.PI * R;

/** The Plans hero ring: done of total, white on the green hero. */
export function Ring({ done, total, size = 56 }: { done: number; total: number; size?: number }) {
  const len = total > 0 ? (Math.min(done, total) / total) * C : 0;
  return (
    <Svg width={size} height={size} viewBox="0 0 56 56" accessibilityRole="image" accessibilityLabel={`${done} of ${total} set aside this month`}>
      <Circle cx={28} cy={28} r={R} fill="none" stroke={colors.headerGlass} strokeWidth={7} />
      {len > 0 && (
        // Dash offset of a quarter turn starts the arc at 12 o'clock without a transform (not supported on web).
        <Circle cx={28} cy={28} r={R} fill="none" stroke={colors.white} strokeWidth={7} strokeLinecap="round" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={C / 4} />
      )}
      <SvgText x={28} y={33} textAnchor="middle" fontSize={14} fontFamily={font.extrabold} fill={colors.white}>{`${done}/${total}`}</SvgText>
    </Svg>
  );
}
