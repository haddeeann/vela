/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const COLORS = {
  light: {
    primary: '#2D3B8E',
    accent: '#E8A23C',
    background: '#FAFAF8',
    surface: '#F0EDE8',
    border: '#E2DED6',
    textPrimary: '#1C1B18',
    textSecondary: '#6B6860',
    // Calendar grid
    todayBg: '#2D3B8E',
    todayText: '#FFFFFF',
    selectedBg: '#F0EDE8',
    selectedText: '#2D3B8E',
    dayText: '#1C1B18',
    dayTextMuted: '#B4B2A9',
  },
  dark: {
    background: '#1A1A2E',
    surface: '#16213E',
    border: '#2A2A4A',
    textPrimary: '#F0EDE8',
    textSecondary: '#9B98A8',
    primary: '#4A5FCC',
    accent: '#E8A23C',
    // Calendar grid (using standard dark mode values for consistent grid behavior)
    todayBg: '#4A5FCC',
    todayText: '#FFFFFF',
    selectedBg: '#16213E',
    selectedText: '#4A5FCC',
    dayText: '#F0EDE8',
    dayTextMuted: '#9B98A8',
  }
};

export function getTheme(colorScheme: 'light' | 'dark' | null | undefined) {
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  return COLORS[scheme];
}

// Keeping Colors for backward compatibility or direct access, but recommending getTheme()
export const Colors = {
  light: {
    text: COLORS.light.textPrimary,
    background: COLORS.light.background,
    tint: COLORS.light.primary,
    icon: COLORS.light.textSecondary,
    tabIconDefault: COLORS.light.textSecondary,
    tabIconSelected: COLORS.light.primary,
    surface: COLORS.light.surface,
    border: COLORS.light.border,
  },
  dark: {
    text: COLORS.dark.textPrimary,
    background: COLORS.dark.background,
    tint: COLORS.dark.primary,
    icon: COLORS.dark.textSecondary,
    tabIconDefault: COLORS.dark.textSecondary,
    tabIconSelected: COLORS.dark.primary,
    surface: COLORS.dark.surface,
    border: COLORS.dark.border,
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
