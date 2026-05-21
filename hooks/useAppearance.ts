import { useEffect, useState, useCallback } from 'react'
import { ColorSchemeName, useColorScheme } from 'react-native'
import { 
  AppearanceMode,
  getAppearanceMode,
  setAppearanceMode as saveMode,
} from '../utils/appearanceSettings'
import { notifyAppearanceChanged } from './use-color-scheme'

export function useAppearance() {
  const systemScheme = useColorScheme()
  const [mode, setMode] = useState<AppearanceMode>('system')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    getAppearanceMode()
      .then(saved => {
        setMode(saved)
        setIsLoaded(true)
      })
      .catch(() => setIsLoaded(true))
  }, [])

  const colorScheme: ColorSchemeName =
    mode === 'system' ? systemScheme : mode

  const updateMode = useCallback(
    async (next: AppearanceMode) => {
      setMode(next)
      await saveMode(next)
      notifyAppearanceChanged()
    }, []
  )

  return { mode, colorScheme, updateMode, isLoaded }
}
