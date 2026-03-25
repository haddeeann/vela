import * as Notifications from 'expo-notifications';

import { ReminderActionId } from '../types/reminders.types';
import {
  scheduleReminderSequence,
  cancelReminderNotifications,
} from './scheduleReminderSequence';
import {
  updateReminderSnoozed,
  getReminderSnoozeCount,
  getReminderById,
} from '../db/reminderQueries';
import { moveEntryToTomorrow } from '../db/entryCompletion';

type EntryType = 'event' | 'task' | 'anchor';

const MINUTE = 60 * 1000;

const toMs = (timestamp: number): number => {
  return timestamp < 1_000_000_000_000 ? timestamp * 1000 : timestamp;
};

const getTomorrowAtSameTime = (timeSource: number): number => {
  const sourceDate = new Date(toMs(timeSource));
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(
    sourceDate.getHours(),
    sourceDate.getMinutes(),
    sourceDate.getSeconds(),
    sourceDate.getMilliseconds()
  );
  return tomorrow.getTime();
};

const getSnoozeTime = (actionId: ReminderActionId): number | null => {
  if (actionId === 'SNOOZE_5_MIN' || actionId === 'ON_MY_WAY') {
    return Date.now() + 5 * MINUTE;
  }

  if (actionId === 'SNOOZE_15_MIN' || actionId === 'RUNNING_LATE') {
    return Date.now() + 15 * MINUTE;
  }

  if (actionId === 'SNOOZE_30_MIN') {
    return Date.now() + 30 * MINUTE;
  }

  return null;
};

export const handleSnooze = async (params: {
  actionId: ReminderActionId;
  reminderId: string;
  entryId: string;
  entryType: EntryType;
  entryTitle: string;
  currentNotificationId?: string;
}): Promise<void> => {
  const {
    actionId,
    reminderId,
    entryId,
    entryType,
    entryTitle,
    currentNotificationId,
  } = params;

  if (currentNotificationId) {
    await cancelReminderNotifications([currentNotificationId]);
  }

  if (actionId === 'SNOOZE_TOMORROW') {
    await moveEntryToTomorrow(entryId);

    const reminder = await getReminderById(reminderId);
    const scheduledAtSource =
      typeof reminder?.scheduled_at === 'number' ? reminder.scheduled_at : Date.now();
    const newTime = getTomorrowAtSameTime(scheduledAtSource);
    const currentSnoozeCount = await getReminderSnoozeCount(reminderId);

    const result = await scheduleReminderSequence({
      reminderId,
      entryId,
      entryType,
      entryTitle,
      scheduledAt: newTime,
      isEscalated: currentSnoozeCount >= 2,
    });

    await updateReminderSnoozed(reminderId, newTime, result.nowNotificationId);

    const newSnoozeCount = await getReminderSnoozeCount(reminderId);
    if (newSnoozeCount === 2) {
      console.log(`Escalated reminder scheduled for: ${entryTitle}`);
    }

    return;
  }

  const newTime = getSnoozeTime(actionId);
  if (!newTime) {
    return;
  }

  const currentSnoozeCount = await getReminderSnoozeCount(reminderId);

  const result = await scheduleReminderSequence({
    reminderId,
    entryId,
    entryType,
    entryTitle,
    scheduledAt: newTime,
    isEscalated: currentSnoozeCount >= 2,
  });

  if (actionId === 'ON_MY_WAY') {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: entryTitle,
        body: `You should be there for ${entryTitle} now.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(Date.now() + 5 * MINUTE),
      },
    });
  }

  await updateReminderSnoozed(reminderId, newTime, result.nowNotificationId);

  const newSnoozeCount = await getReminderSnoozeCount(reminderId);
  if (newSnoozeCount === 2) {
    console.log(`Escalated reminder scheduled for: ${entryTitle}`);
  }
};
