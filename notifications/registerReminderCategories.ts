import * as Notifications from 'expo-notifications';
import { NotificationCategoryId, ReminderActionId } from '../types/reminders.types';

type EntryType = 'event' | 'task' | 'anchor';
type ReminderCategoryAction = {
  identifier: ReminderActionId;
  buttonTitle: string;
};

export const registerReminderCategories = async (): Promise<void> => {
  await Notifications.setNotificationChannelAsync('vela-timers', {
    name: 'Quick Timers',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#4A5FCC',
    enableVibrate: true,
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync('vela-reminders', {
    name: 'Entry Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    enableVibrate: true,
    showBadge: true,
  });

  await Notifications.setNotificationChannelAsync('vela-alarms', {
    name: 'Alarms',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 500, 250, 500],
    enableVibrate: true,
    showBadge: true,
    bypassDnd: false,
  });

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
