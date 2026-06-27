import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking, Platform } from 'react-native';

const EXACT_ALARM_PROMPT_KEY = 'vela_exact_alarm_prompt_seen';
const REQUEST_EXACT_ALARM_ACTION =
  'android.settings.REQUEST_SCHEDULE_EXACT_ALARM';

export const shouldPromptForExactAlarmSettings = ({
  os,
  version,
  hasPrompted,
}: {
  os: string;
  version: string | number;
  hasPrompted: boolean;
}): boolean => {
  const sdkVersion =
    typeof version === 'number' ? version : Number.parseInt(version, 10);

  return os === 'android' && sdkVersion >= 31 && !hasPrompted;
};

export const openExactAlarmSettings = async (): Promise<void> => {
  try {
    await Linking.sendIntent(REQUEST_EXACT_ALARM_ACTION);
  } catch {
    await Linking.openSettings();
  }
};

export const promptForExactAlarmSettingsIfNeeded = async (): Promise<void> => {
  const hasPrompted =
    await AsyncStorage.getItem(EXACT_ALARM_PROMPT_KEY) === 'true';

  if (!shouldPromptForExactAlarmSettings({
    os: Platform.OS,
    version: Platform.Version,
    hasPrompted,
  })) {
    return;
  }

  await AsyncStorage.setItem(EXACT_ALARM_PROMPT_KEY, 'true');

  Alert.alert(
    'Allow exact alarms?',
    'Vela uses exact alarms for timers and time-sensitive reminders. If Android shows an "Alarms & reminders" setting, allow it so timers fire on time.',
    [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Open settings',
        onPress: () => {
          openExactAlarmSettings().catch(() => {});
        },
      },
    ]
  );
};
