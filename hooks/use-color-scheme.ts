import { useEffect, useState } from 'react'
import { 
  useColorScheme as useSystemColorScheme,
  ColorSchemeName 
} from 'react-native'
import { 
  getAppearanceMode,
  AppearanceMode,
} from '../utils/appearanceSettings'

const listeners = new Set<() => void>()

export function notifyAppearanceChanged() {
  listeners.forEach((listener) => listener())
}

function resolveScheme(
  mode: AppearanceMode,
  systemScheme: ColorSchemeName
): ColorSchemeName {
  if (mode === 'light' || mode === 'dark') return mode
  return systemScheme
}

export function useColorScheme(): ColorSchemeName {
  const systemScheme = useSystemColorScheme()
  const [scheme, setScheme] = 
    useState<ColorSchemeName>(systemScheme)

  useEffect(() => {
    const apply = () => {
      getAppearanceMode().then(mode => {
        setScheme(resolveScheme(mode, systemScheme))
      }).catch(() => {})
    }
    apply()
    listeners.add(apply)
    return () => {
      listeners.delete(apply)
    }
  }, [systemScheme])

  return scheme
}
