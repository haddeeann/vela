import { initDB } from '../db';
import { ReminderNotificationData, ScheduledReminderResult } from '../types/reminders.types';

export const getReminderById = async (reminderId: string): Promise<any> => {
  const db = await initDB();
  const reminder = await db.getFirstAsync('SELECT * FROM reminders WHERE id = ?', [reminderId]);
  return reminder;
};

export const updateReminderFired = async (
  reminderId: string,
  notificationId: string
): Promise<void> => {
  const db = await initDB();
  await db.runAsync(
    'UPDATE reminders SET is_fired = 1, expo_notification_id = ? WHERE id = ?',
    [notificationId, reminderId]
  );
};

export const updateReminderSnoozed = async (
  reminderId: string,
  newScheduledAt: number,
  newNotificationId: string
): Promise<void> => {
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
};

export const getReminderSnoozeCount = async (reminderId: string): Promise<number> => {
  const db = await initDB();
  const row = await db.getFirstAsync('SELECT snooze_count FROM reminders WHERE id = ?', [reminderId]) as
    | { snooze_count: number | null }
    | undefined;

  return row?.snooze_count ?? 0;
};

export const markReminderSkipped = async (reminderId: string): Promise<void> => {
  const db = await initDB();
  await db.runAsync('UPDATE reminders SET is_fired = 1 WHERE id = ?', [reminderId]);
};

export const saveNotificationIds = async (
  reminderId: string,
  result: ScheduledReminderResult
): Promise<void> => {
  const db = await initDB();
  await db.runAsync(
    'UPDATE reminders SET expo_notification_id = ? WHERE id = ?',
    [result.nowNotificationId, reminderId]
  );
};

export type { ReminderNotificationData };
