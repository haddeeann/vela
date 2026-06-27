import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  NOTIFICATION_CHANNEL_IDS,
  NOTIFICATION_CHANNEL_VERSION,
  NOTIFICATION_CHANNEL_VERSION_KEY,
} from '@/constants/notificationChannels';
import { NotificationCategoryId, ReminderActionId } from '../types/reminders.types';

type EntryType = 'event' | 'task' | 'anchor';
type ReminderCategoryAction = {
  identifier: ReminderActionId;
  buttonTitle: string;
};

export const registerReminderCategories = async (): Promise<boolean> => {
  const storedVersion = await AsyncStorage.getItem(
    NOTIFICATION_CHANNEL_VERSION_KEY
  );
  const didMigrateChannels =
    storedVersion !== String(NOTIFICATION_CHANNEL_VERSION);

  await Notifications.setNotificationChannelAsync(
    NOTIFICATION_CHANNEL_IDS.alarms, {
      name: 'Alarms',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      enableVibrate: true,
      enableLights: true,
      lightColor: '#4A5FCC',
      showBadge: true,
      bypassDnd: true,
      lockscreenVisibility: 
        Notifications.AndroidNotificationVisibility.PUBLIC,
    }
  )

  await Notifications.setNotificationChannelAsync(
    NOTIFICATION_CHANNEL_IDS.timers, {
      name: 'Quick Timers',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      enableVibrate: true,
      enableLights: true,
      lightColor: '#E8A23C',
      showBadge: true,
      bypassDnd: false,
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PUBLIC,
    }
  )

  await Notifications.setNotificationChannelAsync(
    NOTIFICATION_CHANNEL_IDS.reminders, {
      name: 'Event and Task Reminders',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 400, 200, 400],
      enableVibrate: true,
      enableLights: true,
      lightColor: '#2BA888',
      showBadge: true,
      bypassDnd: false,
      lockscreenVisibility:
        Notifications.AndroidNotificationVisibility.PUBLIC,
    }
  )

  await Notifications.setNotificationCategoryAsync('REMINDER_EVENT', [
    { identifier: 'SNOOZE_5_MIN', buttonTitle: '5 more min' },
    { identifier: 'ON_MY_WAY', buttonTitle: 'On my way' },
    { identifier: 'RUNNING_LATE', buttonTitle: 'Running late' },
    { identifier: 'CANT_MAKE_IT', buttonTitle: "Can't make it" },
  ] as ReminderCategoryAction[]);

  await Notifications.setNotificationCategoryAsync('REMINDER_TASK', [
    { identifier: 'DONE', buttonTitle: 'Done' },
    { identifier: 'SNOOZE_30_MIN', buttonTitle: 'After this' },
    { identifier: 'SNOOZE_TOMORROW', buttonTitle: 'Tomorrow' },
    { identifier: 'SKIP_TODAY', buttonTitle: 'Skip' },
  ] as ReminderCategoryAction[]);

  await Notifications.setNotificationCategoryAsync('REMINDER_ANCHOR', [
    { identifier: 'DONE', buttonTitle: 'Done' },
    { identifier: 'SNOOZE_5_MIN', buttonTitle: '5 more min' },
    { identifier: 'SKIP_TODAY', buttonTitle: 'Skip today' },
  ] as ReminderCategoryAction[]);

  await Notifications.setNotificationCategoryAsync('REMINDER_ESCALATED', [
    { identifier: 'DONE', buttonTitle: 'Yes, do it' },
    { identifier: 'SNOOZE_30_MIN', buttonTitle: 'Remind in 30 min' },
    { identifier: 'SNOOZE_TOMORROW', buttonTitle: 'Move to tomorrow' },
    { identifier: 'SKIP_TODAY', buttonTitle: 'Skip today' },
  ] as ReminderCategoryAction[]);

  await AsyncStorage.setItem(
    NOTIFICATION_CHANNEL_VERSION_KEY,
    String(NOTIFICATION_CHANNEL_VERSION)
  );

  return didMigrateChannels;
};

export const getCategoryForEntry = (
  entryType: EntryType,
  isEscalated: boolean
): NotificationCategoryId => {
  if (isEscalated) {
    return 'REMINDER_ESCALATED';
  }

  if (entryType === 'event') {
    return 'REMINDER_EVENT';
  }

  if (entryType === 'task') {
    return 'REMINDER_TASK';
  }

  return 'REMINDER_ANCHOR';
};
