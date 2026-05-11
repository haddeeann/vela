import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'vela_appearance_mode'

export type AppearanceMode = 'system' | 'light' | 'dark'

export const getAppearanceMode = async (): 
  Promise<AppearanceMode> => {
  const val = await AsyncStorage.getItem(KEY)
  if (val === 'light' || val === 'dark') return val
  return 'system'
}

export const setAppearanceMode = async (
  mode: AppearanceMode
): Promise<void> => {
  await AsyncStorage.setItem(KEY, mode)
}
