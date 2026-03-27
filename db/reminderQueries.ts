import { initDB } from '../db';
import { ReminderNotificationData, ScheduledReminderResult } from '../types/reminders.types';
import { handleDbError } from '../utils/errorHandler';

export const getReminderById = async (reminderId: string): Promise<any> => {
  const db = await initDB();
  const reminder = await db.getFirstAsync('SELECT * FROM reminders WHERE id = ?', [reminderId]);
  return reminder;
};

export const updateReminderFired = async (
  reminderId: string,
  notificationId: string
): Promise<void> => {
  try {
    const db = await initDB();
    await db.runAsync(
      'UPDATE reminders SET is_fired = 1, expo_notification_id = ? WHERE id = ?',
      [notificationId, reminderId]
    );
  } catch (error) {
    handleDbError(error, 'updateReminderFired');
    throw error;
  }
};

export const updateReminderSnoozed = async (
  reminderId: string,
  newScheduledAt: number,
  newNotificationId: string
): Promise<void> => {
  try {
    const db = await initDB();
    await db.runAsync(
      `UPDATE reminders
       SET snooze_count = COALESCE(snooze_count, 0) + 1,
           scheduled_at = ?,
           expo_notification_id = ?,
           is_fired = 0
       WHERE id = ?`,
      [newScheduledAt, newNotificationId, reminderId]
    );
  } catch (error) {
    handleDbError(error, 'updateReminderSnoozed');
    throw error;
  }
};

export const getReminderSnoozeCount = async (reminderId: string): Promise<number> => {
  const db = await initDB();
  const row = await db.getFirstAsync('SELECT snooze_count FROM reminders WHERE id = ?', [reminderId]) as
    | { snooze_count: number | null }
    | undefined;

  return row?.snooze_count ?? 0;
};

export const markReminderSkipped = async (reminderId: string): Promise<void> => {
  try {
    const db = await initDB();
    await db.runAsync('UPDATE reminders SET is_fired = 1 WHERE id = ?', [reminderId]);
  } catch (error) {
    handleDbError(error, 'markReminderSkipped');
    throw error;
  }
};

export const saveNotificationIds = async (
  reminderId: string,
  result: ScheduledReminderResult
): Promise<void> => {
  try {
    const db = await initDB();
    await db.runAsync(
      'UPDATE reminders SET expo_notification_id = ? WHERE id = ?',
      [result.nowNotificationId, reminderId]
    );
  } catch (error) {
    handleDbError(error, 'saveNotificationIds');
    throw error;
  }
};

export type { ReminderNotificationData };
