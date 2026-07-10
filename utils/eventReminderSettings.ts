import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { ReminderType } from '@/constants/reminders';

export const EVENT_DEFAULT_REMINDER_KEY = 'vela_event_default_reminder';
export const DEFAULT_EVENT_REMINDER: Exclude<ReminderType, 'use-default'> = 'none';

export const getDefaultEventReminder = async (): Promise<Exclude<ReminderType, 'use-default'>> => {
  const value = await AsyncStorage.getItem(EVENT_DEFAULT_REMINDER_KEY);
  if (
    value === 'none' ||
    value === 'at-start' ||
    value === '5-min' ||
    value === '10-min' ||
    value === '30-min' ||
    value === '1-hour'
  ) {
    return value;
  }
  return DEFAULT_EVENT_REMINDER;
};

export const setDefaultEventReminder = async (
  value: Exclude<ReminderType, 'use-default'>
): Promise<void> => {
  await AsyncStorage.setItem(EVENT_DEFAULT_REMINDER_KEY, value);
};

export function useEventReminderSettings() {
  const [defaultReminder, setDefaultReminderState] = useState<Exclude<ReminderType, 'use-default'>>(
    DEFAULT_EVENT_REMINDER
  );

  useEffect(() => {
    getDefaultEventReminder()
      .then(setDefaultReminderState)
      .catch(() => {});
  }, []);

  const setDefaultReminder = useCallback(async (value: Exclude<ReminderType, 'use-default'>) => {
    setDefaultReminderState(value);
    await setDefaultEventReminder(value);
  }, []);

  return {
    defaultReminder,
    setDefaultReminder,
  };
}
