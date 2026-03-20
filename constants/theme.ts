/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const COLORS = {
  // Core
  primary: '#2D3B8E',        // Constellation Indigo — today circle, FAB, selected
  accent: '#E8A23C',         // Star Gold — active toggle, highlights
  background: '#FAFAF8',     // Warm white — main background
  surface: '#F0EDE8',        // Warm gray — cards, modal background
  border: '#E2DED6',         // Subtle border
  textPrimary: '#1C1B18',    // Near black
  textSecondary: '#6B6860',  // Muted

  // Calendar grid
  todayBg: '#2D3B8E',
  todayText: '#FFFFFF',
  selectedBg: '#F0EDE8',
  selectedText: '#2D3B8E',
  dayText: '#1C1B18',
  dayTextMuted: '#B4B2A9',   // Days outside current month

  // Event categories
  work: '#3B6FD4',
  personal: '#2BA888',
  health: '#D94F3D',
  social: '#7F50C4',
  other: '#888780',
};

export const Colors = {
  light: {
    text: COLORS.textPrimary,
    background: COLORS.background,
    tint: COLORS.primary,
    icon: COLORS.textSecondary,
    tabIconDefault: COLORS.textSecondary,
    tabIconSelected: COLORS.primary,
    surface: COLORS.surface,
    border: COLORS.border,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: '#fff',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
    surface: '#252728',
    border: '#333',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
