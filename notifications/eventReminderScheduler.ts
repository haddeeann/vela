import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { DEFAULT_REMINDER_OPTIONS, ReminderType } from '@/constants/reminders';
import { NOTIFICATION_CHANNEL_IDS } from '@/constants/notificationChannels';
import { initDB } from '@/db';
import { getDefaultEventReminder } from '@/utils/eventReminderSettings';

type EventReminderEntry = {
  id: string;
  title: string;
  date: string;
  start_time: string;
  entry_type: string;
  recurrence?: string | null;
  reminder_mode?: ReminderType | null;
  reminder_notification_id?: string | null;
};

export type ScheduleEventReminderResult =
  | { status: 'scheduled'; notificationId: string }
  | { status: 'cleared' }
  | { status: 'skipped'; reason: string }
  | { status: 'permission-denied' };

const OPTION_MINUTES = new Map(
  DEFAULT_REMINDER_OPTIONS.map((option) => [option.id, option.minutesBefore] as const)
);

const parseEventStartMs = (date: string, startTime: string): number | null => {
  if (!date || !startTime) return null;
  const base = new Date(`${date}T00:00:00`);
  if (Number.isNaN(base.getTime())) return null;

  const [timePart, periodRaw] = startTime.trim().split(' ');
  if (!timePart || !periodRaw) return null;
  const [rawHours, rawMinutes] = timePart.split(':').map(Number);
  if (Number.isNaN(rawHours) || Number.isNaN(rawMinutes)) return null;

  const period = periodRaw.toUpperCase();
  let hours = rawHours;
  if (period === 'PM' && hours < 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  base.setHours(hours, rawMinutes, 0, 0);
  return base.getTime();
};

const cancelIfPresent = async (notificationId?: string | null): Promise<void> => {
  if (!notificationId) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
};

const persistReminderNotificationId = async (
  entryId: string,
  notificationId: string | null
): Promise<void> => {
  const db = await initDB();
  await db.runAsync(
    'UPDATE entries SET reminder_notification_id = ?, updated_at = ? WHERE id = ?',
    [notificationId, Math.floor(Date.now() / 1000), entryId]
  );
};

export const ensureEventReminderPermission = async (): Promise<boolean> => {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
};

const resolveReminderMinutes = async (
  mode: ReminderType | null | undefined
): Promise<number | null> => {
  const effectiveMode = mode ?? 'use-default';
  if (effectiveMode === 'use-default') {
    const defaultMode = await getDefaultEventReminder();
    return OPTION_MINUTES.get(defaultMode) ?? null;
  }
  return OPTION_MINUTES.get(effectiveMode) ?? null;
};

export const scheduleEventReminderForEntry = async (
  entry: EventReminderEntry
): Promise<ScheduleEventReminderResult> => {
  await cancelIfPresent(entry.reminder_notification_id);

  if (entry.entry_type !== 'event') {
    await persistReminderNotificationId(entry.id, null);
    return { status: 'cleared' };
  }

  if (entry.recurrence && entry.recurrence !== 'none') {
    await persistReminderNotificationId(entry.id, null);
    return { status: 'skipped', reason: 'Recurring event reminders are currently scoped out.' };
  }

  const minutesBefore = await resolveReminderMinutes(entry.reminder_mode);
  if (minutesBefore === null) {
    await persistReminderNotificationId(entry.id, null);
    return { status: 'cleared' };
  }

  const startMs = parseEventStartMs(entry.date, entry.start_time);
  if (!startMs) {
    await persistReminderNotificationId(entry.id, null);
    return { status: 'skipped', reason: 'Event start time is missing or invalid.' };
  }

  const triggerAtMs = startMs - minutesBefore * 60 * 1000;
  if (triggerAtMs <= Date.now()) {
    await persistReminderNotificationId(entry.id, null);
    return { status: 'skipped', reason: 'Reminder would fire in the past.' };
  }

  const hasPermission = await ensureEventReminderPermission();
  if (!hasPermission) {
    await persistReminderNotificationId(entry.id, null);
    return { status: 'permission-denied' };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_IDS.eventReminders, {
      name: 'Event Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 300, 150, 300],
      enableVibrate: true,
      enableLights: true,
      lightColor: '#D4793A',
      showBadge: true,
      bypassDnd: false,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: entry.title || 'Event reminder',
      body: minutesBefore === 0 ? 'Starting now' : `Starts in ${minutesBefore} min`,
      data: {
        type: 'event-reminder',
        entryId: entry.id,
      },
      android: {
        channelId: NOTIFICATION_CHANNEL_IDS.eventReminders,
        priority: 'high',
        sound: 'default',
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(triggerAtMs),
    },
  });

  await persistReminderNotificationId(entry.id, notificationId);
  return { status: 'scheduled', notificationId };
};

export const reapplyDefaultEventReminders = async (): Promise<void> => {
  const db = await initDB();
  const entries = await db.getAllAsync(
    `SELECT e.id, e.title, e.date, e.start_time, e.entry_type, e.reminder_mode, e.reminder_notification_id, rr.frequency AS recurrence
     FROM entries e
     LEFT JOIN recurrence_rules rr ON rr.entry_id = e.id
     WHERE e.entry_type = 'event' AND (e.reminder_mode IS NULL OR e.reminder_mode = 'use-default')`
  ) as EventReminderEntry[];

  for (const entry of entries) {
    await scheduleEventReminderForEntry(entry);
  }
};

export const cancelEventReminderForEntry = async (
  entryId: string,
  currentNotificationId?: string | null
): Promise<void> => {
  await cancelIfPresent(currentNotificationId);
  await persistReminderNotificationId(entryId, null);
};
