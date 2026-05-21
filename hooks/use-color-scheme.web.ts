import { useEffect, useState } from 'react'
import {
  useColorScheme as useSystemColorScheme,
  ColorSchemeName,
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

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme(): ColorSchemeName {
  const systemScheme = useSystemColorScheme()
  const [hasHydrated, setHasHydrated] = useState(false)
  const [scheme, setScheme] = useState<ColorSchemeName>('light')

  useEffect(() => {
    setHasHydrated(true)
  }, [])

  useEffect(() => {
    if (!hasHydrated) return

    const apply = () => {
      getAppearanceMode()
        .then((mode) => setScheme(resolveScheme(mode, systemScheme)))
        .catch(() => {})
    }
    apply()
    listeners.add(apply)
    return () => {
      listeners.delete(apply)
    }
  }, [hasHydrated, systemScheme])

  if (!hasHydrated) {
    return 'light'
  }

  return scheme
}
