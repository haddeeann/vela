import { ColorSchemeName } from 'react-native'

export const COLORS = {
  work: '#4F86F7',
  personal: '#8B6CF6',
  health: '#22B573',
  social: '#E08A3A',
  other: '#8A8F98',
}

export const Colors = {
  light: {
    text: '#2C2A26',
    background: '#FAF8F4',
    tint: '#1D9E75',
    icon: '#5C5A55',
    tabIconDefault: '#7A766E',
    tabIconSelected: '#1D9E75',
  },
  dark: {
    text: '#F0EDE8',
    background: '#1C1A17',
    tint: '#25C48F',
    icon: '#B8B5B0',
    tabIconDefault: '#8A8780',
    tabIconSelected: '#25C48F',
  },
}

export const ENTRY_COLORS = {
  event: {
    light: {
      primary: '#D4793A',
      background: '#FEF4EC',
      badge: '#FEE8D4',
      badgeText: '#854F0B',
    },
    dark: {
      primary: '#EF9F27',
      background: '#2E2218',
      badge: '#3D2A0E',
      badgeText: '#EF9F27',
    },
  },
  task: {
    light: {
      primary: '#378ADD',
      background: '#EAF1FB',
      badge: '#D4E6F7',
      badgeText: '#185FA5',
    },
    dark: {
      primary: '#6BAEE8',
      background: '#19222E',
      badge: '#1A2E42',
      badgeText: '#6BAEE8',
    },
  },
  anchor: {
    light: {
      primary: '#7F77DD',
      background: '#EFEEFC',
      badge: '#CECBF6',
      badgeText: '#3C3489',
    },
    dark: {
      primary: '#A9A4EE',
      background: '#201F30',
      badge: '#2A2845',
      badgeText: '#A9A4EE',
    },
  },
}

export const getEntryColors = (
  entryType: string,
  colorScheme: ColorSchemeName
) => {
  const isDark = colorScheme === 'dark'
  const colors = ENTRY_COLORS[
    entryType as keyof typeof ENTRY_COLORS
  ] ?? ENTRY_COLORS.event
  return isDark ? colors.dark : colors.light
}

export const EVENT_COLOR_OVERRIDE_SWATCHES = [
  '#D4793A',
  '#B5882B',
  '#2F4E8F',
  '#1F3A68',
  '#2E6F95',
  '#4A5AA8',
  '#7A4E9D',
  '#8C4B3F',
  '#2E7D6B',
] as const

const normalizeHexColor = (value: string): string | null => {
  if (!value) return null
  const trimmed = value.trim()
  const hex = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null
  return `#${hex.toUpperCase()}`
}

const mixHexColors = (foreground: string, background: string, ratio: number): string => {
  const safeRatio = Math.min(1, Math.max(0, ratio))
  const fg = normalizeHexColor(foreground) ?? '#000000'
  const bg = normalizeHexColor(background) ?? '#000000'

  const fgR = parseInt(fg.slice(1, 3), 16)
  const fgG = parseInt(fg.slice(3, 5), 16)
  const fgB = parseInt(fg.slice(5, 7), 16)
  const bgR = parseInt(bg.slice(1, 3), 16)
  const bgG = parseInt(bg.slice(3, 5), 16)
  const bgB = parseInt(bg.slice(5, 7), 16)

  const r = Math.round(fgR * safeRatio + bgR * (1 - safeRatio))
  const g = Math.round(fgG * safeRatio + bgG * (1 - safeRatio))
  const b = Math.round(fgB * safeRatio + bgB * (1 - safeRatio))

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase()
}

type EntryColorInput = {
  entryType?: string
  colorOverride?: string | null
}

export const resolveEntryColors = (
  entry: EntryColorInput,
  colorScheme: ColorSchemeName
) => {
  const entryType = entry.entryType ?? 'event'
  const fallback = getEntryColors(entryType, colorScheme)
  const overrideHex = normalizeHexColor(entry.colorOverride ?? '')

  if (entryType !== 'event' || !overrideHex) {
    return fallback
  }

  const isDark = colorScheme === 'dark'
  const backgroundBase = isDark ? '#1C1A17' : '#FFFFFF'
  const badgeBase = isDark ? '#000000' : '#FFFFFF'

  return {
    primary: overrideHex,
    background: mixHexColors(overrideHex, backgroundBase, isDark ? 0.26 : 0.12),
    badge: mixHexColors(overrideHex, badgeBase, isDark ? 0.34 : 0.20),
    badgeText: isDark ? '#FFFFFF' : mixHexColors(overrideHex, '#000000', 0.55),
  }
}

export interface VelaTheme {
  background: string
  surface: string
  surfaceVariant: string
  surfaceRaised: string
  border: string
  borderStrong: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  primary: string
  primaryLight: string
  primaryText: string
  accent: string
  dayTextMuted: string
  error: string
  errorLight: string
}

const lightTheme: VelaTheme = {
  background: '#FAF8F4',
  surface: '#F2EFE9',
  surfaceVariant: '#E9E4DB',
  surfaceRaised: '#FFFFFF',
  border: '#E8E4DC',
  borderStrong: '#C8C4BC',
  textPrimary: '#2C2A26',
  textSecondary: '#5C5A55',
  textMuted: '#7A766E',
  primary: '#1D9E75',
  primaryLight: '#E1F5EE',
  primaryText: '#085041',
  accent: '#1D9E75',
  dayTextMuted: '#7A766E',
  error: '#C94040',
  errorLight: '#FCEBEB',
}

const darkTheme: VelaTheme = {
  background: '#1C1A17',
  surface: '#272420',
  surfaceVariant: '#322F2A',
  surfaceRaised: '#302D29',
  border: '#3A3630',
  borderStrong: '#504C46',
  textPrimary: '#F0EDE8',
  textSecondary: '#B8B5B0',
  textMuted: '#8A8780',
  primary: '#25C48F',
  primaryLight: '#0F3D2A',
  primaryText: '#9FE1CB',
  accent: '#25C48F',
  dayTextMuted: '#8A8780',
  error: '#E87070',
  errorLight: '#2E1A1A',
}

export const getTheme = (
  colorScheme: ColorSchemeName
): VelaTheme => {
  return colorScheme === 'dark' ? darkTheme : lightTheme
}
