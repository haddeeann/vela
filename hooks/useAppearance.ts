import { useEffect, useState } from 'react'
import { useColorScheme as useSystemColorScheme } 
  from 'react-native'
import { 
  AppearanceMode, 
  getAppearanceMode,
  setAppearanceMode as saveMode,
} from '../utils/appearanceSettings'
import { ColorSchemeName } from 'react-native'

export function useAppearance() {
  const systemScheme = useSystemColorScheme()
  const [mode, setMode] = useState<AppearanceMode>('system')
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    getAppearanceMode().then(saved => {
      setMode(saved)
      setIsLoaded(true)
    }).catch(() => setIsLoaded(true))
  }, [])

  const colorScheme: ColorSchemeName = 
    mode === 'system' ? systemScheme : mode

  const updateMode = async (next: AppearanceMode) => {
    setMode(next)
    await saveMode(next)
  }

  return { mode, colorScheme, updateMode, isLoaded }
}
