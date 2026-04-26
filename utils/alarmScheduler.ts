import * as Notifications from 'expo-notifications';
import { Alarm } from '../types/alarms.types';

const formatTime12Hour = (time24: string): string => {
  const [hourPart, minutePart] = time24.split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const parseTime = (time24: string): { hour: number; minute: number } => {
  const [hourPart, minutePart] = time24.split(':');
  return {
    hour: Number(hourPart),
    minute: Number(minutePart),
  };
};

export const scheduleAlarm = async (alarm: Alarm): Promise<string[]> => {
  const { hour, minute } = parseTime(alarm.time);
  const body = formatTime12Hour(alarm.time);

  const notificationIds: string[] = [];

  for (const day of alarm.days) {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: alarm.title,
        body,
        sound: true,
        data: {
          isAlarm: true,
          alarmId: alarm.id,
        },
        android: {
          channelId: 'vela-alarms',
          priority: 'max',
          fullScreenIntent: true,
          sound: 'default',
          vibrate: [0, 500, 200, 500, 200, 500],
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: day + 1,
        hour,
        minute,
      },
    });

    notificationIds.push(notificationId);
  }

  return notificationIds;
};

export const cancelAlarm = async (notificationIds: string[]): Promise<void> => {
  await Promise.all(
    notificationIds.map((notificationId) =>
      Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {})
    )
  );
};

export const rescheduleAlarm = async (alarm: Alarm): Promise<string[]> => {
  if (alarm.notification_ids.length > 0) {
    await cancelAlarm(alarm.notification_ids);
  }

  return scheduleAlarm(alarm);
};
