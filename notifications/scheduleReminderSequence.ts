import type * as NotificationsModule from 'expo-notifications';

import {
  ReminderNotificationData,
  REMINDER_MESSAGES,
  ScheduledReminderResult,
} from '../types/reminders.types';
import { NOTIFICATION_CHANNEL_IDS } from '@/constants/notificationChannels';
import { getCategoryForEntry } from './registerReminderCategories';

type EntryType = 'event' | 'task' | 'anchor';

let notificationsModulePromise: Promise<typeof NotificationsModule> | null = null;

const getNotificationsModule = async (): Promise<typeof NotificationsModule> => {
  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications');
  }

  return notificationsModulePromise;
};

const toMs = (timestamp: number): number => {
  return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
};

export const scheduleReminderSequence = async (params: {
  reminderId: string;
  entryId: string;
  entryType: EntryType;
  entryTitle: string;
  scheduledAt: number;
  isEscalated?: boolean;
}): Promise<ScheduledReminderResult> => {
  const Notifications = await getNotificationsModule();
  const {
    reminderId,
    entryId,
    entryType,
    entryTitle,
    scheduledAt,
    isEscalated = false,
  } = params;
  const categoryIdentifier = getCategoryForEntry(entryType, isEscalated);

  const scheduledAtMs = toMs(scheduledAt);
  const nowMs = Date.now();

  const nowData: ReminderNotificationData = {
    entryId,
    entryType,
    reminderId,
    stage: 'now',
    entryTitle,
  };

  const nowNotificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: entryTitle,
      body: isEscalated
        ? REMINDER_MESSAGES[entryType].escalated(entryTitle)
        : REMINDER_MESSAGES[entryType].now(entryTitle),
      categoryIdentifier,
      data: {
        ...nowData,
        type: 'reminder',
      },
      android: {
        channelId: NOTIFICATION_CHANNEL_IDS.reminders,
        priority: 'max',
        fullScreenIntent: true,
        sound: 'default',
        vibrate: [0, 500, 200, 500, 200, 500],
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(scheduledAtMs),
    },
  });

  const result: ScheduledReminderResult = {
    nowNotificationId,
  };

  if (!isEscalated && scheduledAtMs - nowMs > 15 * 60 * 1000) {
    const warningNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: entryTitle,
        body: REMINDER_MESSAGES[entryType].warning(entryTitle),
        data: {
          ...nowData,
          stage: 'warning',
          type: 'reminder',
        },
        android: {
          channelId: NOTIFICATION_CHANNEL_IDS.reminders,
          priority: 'max',
          fullScreenIntent: true,
          sound: 'default',
          vibrate: [0, 500, 200, 500, 200, 500],
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(scheduledAtMs - 15 * 60 * 1000),
      },
    });

    result.warningNotificationId = warningNotificationId;
  }

  if (!isEscalated && scheduledAtMs - nowMs > 5 * 60 * 1000) {
    const soonNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: entryTitle,
        body: REMINDER_MESSAGES[entryType].soon(entryTitle),
        data: {
          ...nowData,
          stage: 'soon',
          type: 'reminder',
        },
        android: {
          channelId: NOTIFICATION_CHANNEL_IDS.reminders,
          priority: 'max',
          fullScreenIntent: true,
          sound: 'default',
          vibrate: [0, 500, 200, 500, 200, 500],
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(scheduledAtMs - 5 * 60 * 1000),
      },
    });

    result.soonNotificationId = soonNotificationId;
  }

  return result;
};

export const cancelReminderNotifications = async (notificationIds: string[]): Promise<void> => {
  const Notifications = await getNotificationsModule();
  await Promise.all(
    notificationIds.map((notificationId) =>
      Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {})
    )
  );
};
