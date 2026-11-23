import { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { colors } from './theme';

export type KasiMood = 'happy' | 'thinking' | 'celebrating' | 'panic';

const k = colors.kasi;

/** Kasi, the round yellow face from the v5 mockups. Drawn in SVG so it looks the same on Android and iOS. */
export function Kasi({ mood, size = 44 }: { mood: KasiMood; size?: number }) {
  const id = useId().replace(/:/g, '');
  const face = `f${id}`;
  const hand = `h${id}`;
  const shared = (
    <>
      <RadialGradient id={face} cx="50%" cy="38%" r="62%">
        <Stop offset="0" stopColor={k.light} />
        <Stop offset="0.7" stopColor={k.mid} />
        <Stop offset="1" stopColor={k.edge} />
      </RadialGradient>
      <LinearGradient id={hand} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={k.hand} />
        <Stop offset="1" stopColor={k.handEdge} />
      </LinearGradient>
    </>
  );
  const line = { stroke: k.line, fill: 'none', strokeLinecap: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      {mood === 'happy' && (
        <>
          <Defs>
            {shared}
            <RadialGradient id={`c${id}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={k.cheek} stopOpacity={0.55} />
              <Stop offset="1" stopColor={k.cheek} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx="100" cy="100" r="88" fill={`url(#${face})`} />
          <Ellipse cx="100" cy="42" rx="46" ry="18" fill={colors.white} opacity={0.28} />
          <Path d="M54 92 Q70 70 86 92" strokeWidth={9} {...line} />
          <Path d="M114 92 Q130 70 146 92" strokeWidth={9} {...line} />
          <Ellipse cx="50" cy="118" rx="18" ry="11" fill={`url(#c${id})`} />
          <Ellipse cx="150" cy="118" rx="18" ry="11" fill={`url(#c${id})`} />
          <Path d="M62 122 Q100 166 138 122" strokeWidth={9} {...line} />
        </>
      )}
      {mood === 'thinking' && (
        <>
          <Defs>{shared}</Defs>
          <Circle cx="100" cy="96" r="84" fill={`url(#${face})`} />
          <Ellipse cx="100" cy="40" rx="44" ry="17" fill={colors.white} opacity={0.28} />
          <Path d="M56 62 Q72 50 88 60" strokeWidth={7} {...line} />
          <Path d="M114 66 L144 64" strokeWidth={7} {...line} />
          <Ellipse cx="74" cy="86" rx="10" ry="15" fill={k.line} />
          <Ellipse cx="128" cy="86" rx="10" ry="15" fill={k.line} />
          <Path d="M84 128 L124 120" strokeWidth={8} {...line} />
          <Path d="M100 155 C110 152 122 146 128 140 C133 136 138 142 134 147 C126 156 114 162 100 164 Z" fill={`url(#${hand})`} stroke={k.handStroke} strokeWidth={3} strokeLinejoin="round" />
        </>
      )}
      {mood === 'celebrating' && (
        <>
          <Defs>
            {shared}
            <LinearGradient id={`s${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={k.star} />
              <Stop offset="1" stopColor={k.starEdge} />
            </LinearGradient>
          </Defs>
          <Circle cx="100" cy="100" r="88" fill={`url(#${face})`} />
          <Ellipse cx="100" cy="42" rx="46" ry="18" fill={colors.white} opacity={0.28} />
          <Path d="M70 62 L77 77 L93 79 L81 90 L84 106 L70 98 L56 106 L59 90 L47 79 L63 77 Z" fill={`url(#s${id})`} />
          <Path d="M130 62 L137 77 L153 79 L141 90 L144 106 L130 98 L116 106 L119 90 L107 79 L123 77 Z" fill={`url(#s${id})`} />
          <Path d="M54 120 Q100 124 146 120 Q140 170 100 172 Q60 170 54 120 Z" fill={k.line} />
          <Path d="M58 122 Q100 126 142 122 L140 134 Q100 138 60 134 Z" fill={colors.white} />
          <Path d="M78 158 Q100 146 122 158 Q112 170 100 170 Q88 170 78 158 Z" fill={k.tongue} />
        </>
      )}
      {mood === 'panic' && (
        <>
          <Defs>
            {shared}
            <LinearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={k.sweat} />
              <Stop offset="0.45" stopColor={k.sweatLight} stopOpacity={0.65} />
              <Stop offset="0.6" stopColor={k.sweatLight} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Circle cx="100" cy="96" r="84" fill={`url(#${face})`} />
          <Circle cx="100" cy="96" r="84" fill={`url(#b${id})`} />
          <Ellipse cx="72" cy="80" rx="15" ry="19" fill={colors.white} />
          <Ellipse cx="128" cy="80" rx="15" ry="19" fill={colors.white} />
          <Circle cx="72" cy="82" r="6" fill={k.line} />
          <Circle cx="128" cy="82" r="6" fill={k.line} />
          <Path d="M54 54 Q66 48 80 52 M146 54 Q134 48 120 52" strokeWidth={6} {...line} />
          <Ellipse cx="100" cy="140" rx="17" ry="30" fill={k.line} />
          <Path d="M14 196 C8 168 12 138 30 120 C38 112 50 116 48 128 L44 146 C52 134 62 136 60 148 L52 196 Z" fill={`url(#${hand})`} stroke={k.handStroke} strokeWidth={3} strokeLinejoin="round" />
          <Path d="M186 196 C192 168 188 138 170 120 C162 112 150 116 152 128 L156 146 C148 134 138 136 140 148 L148 196 Z" fill={`url(#${hand})`} stroke={k.handStroke} strokeWidth={3} strokeLinejoin="round" />
        </>
      )}
    </Svg>
  );
}
