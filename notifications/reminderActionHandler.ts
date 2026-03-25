import {
  ReminderActionId,
  ReminderNotificationData,
} from '../types/reminders.types';
import { handleSnooze } from './snoozeLogic';
import { markReminderSkipped, updateReminderFired } from '../db/reminderQueries';
import { markEntryComplete, isEntryCompletable } from '../db/entryCompletion';

export const handleReminderAction = async (params: {
  actionId: ReminderActionId | undefined;
  data: ReminderNotificationData;
  currentNotificationId?: string;
}): Promise<{ shouldRefreshUI: boolean }> => {
  const { actionId, data, currentNotificationId } = params;

  try {
    if (!actionId) {
      console.log('Reminder tapped without action button', { data });
      return { shouldRefreshUI: false };
    }

    if (actionId === 'DONE') {
      const completable = await isEntryCompletable(data.entryId);
      if (completable) {
        await markEntryComplete(data.entryId);
      }

      await updateReminderFired(data.reminderId, currentNotificationId ?? '');
      return { shouldRefreshUI: true };
    }

    if (actionId === 'SKIP_TODAY' || actionId === 'CANT_MAKE_IT') {
      await markReminderSkipped(data.reminderId);
      return { shouldRefreshUI: true };
    }

    if (
      actionId === 'SNOOZE_5_MIN' ||
      actionId === 'SNOOZE_15_MIN' ||
      actionId === 'SNOOZE_30_MIN' ||
      actionId === 'SNOOZE_TOMORROW' ||
      actionId === 'ON_MY_WAY' ||
      actionId === 'RUNNING_LATE'
    ) {
      await handleSnooze({
        actionId,
        reminderId: data.reminderId,
        entryId: data.entryId,
        entryType: data.entryType,
        entryTitle: data.entryTitle,
        currentNotificationId,
      });
      return { shouldRefreshUI: false };
    }

    console.log('Unhandled reminder action', { actionId, data });
    return { shouldRefreshUI: false };
  } catch (error) {
    console.error('Failed to handle reminder action', {
      actionId,
      reminderId: data.reminderId,
      entryId: data.entryId,
      error,
    });
    return { shouldRefreshUI: false };
  }
};
