import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from './theme';

type P = { size?: number; color?: string; strokeWidth?: number };

// Stroke paths from the v5 artboards.
const icon =
  (draw: () => React.ReactNode, defaults: { size: number; strokeWidth: number }) =>
  function Icon({ size = defaults.size, color = colors.ink, strokeWidth = defaults.strokeWidth }: P) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {draw()}
      </Svg>
    );
  };

const tab = { size: 24, strokeWidth: 1.8 };
const ui = { size: 20, strokeWidth: 2.2 };

export const HomeIcon = icon(() => <Path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />, tab);
export const ListIcon = icon(() => <Path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />, tab);
export const ScanIcon = icon(() => <Path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M8 12h8" />, { size: 26, strokeWidth: 2.2 });
export const PieIcon = icon(() => (
  <>
    <Path d="M21 12A9 9 0 1 1 12 3v9z" />
    <Path d="M15 3.5A9 9 0 0 1 20.5 9H15z" />
  </>
), tab);
export const TargetIcon = icon(() => (
  <>
    <Circle cx="12" cy="12" r="9" />
    <Circle cx="12" cy="12" r="5" />
    <Circle cx="12" cy="12" r="1" />
  </>
), tab);
export const GearIcon = icon(() => (
  <>
    <Circle cx="12" cy="12" r="3" />
    <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </>
), ui);
export const ChevronLeft = icon(() => <Path d="M15 18l-6-6 6-6" />, ui);
export const ChevronRight = icon(() => <Path d="M9 18l6-6-6-6" />, ui);
export const SearchIcon = icon(() => (
  <>
    <Circle cx="11" cy="11" r="7" />
    <Path d="M21 21l-4.3-4.3" />
  </>
), ui);
export const PlusIcon = icon(() => <Path d="M12 5v14M5 12h14" />, { size: 26, strokeWidth: 2.6 });
export const CloseIcon = icon(() => <Path d="M18 6 6 18M6 6l12 12" />, ui);
export const BackspaceIcon = icon(() => <Path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM18 9l-6 6M12 9l6 6" />, ui);
