import * as Notifications from 'expo-notifications';
import { NOTIFICATION_CHANNEL_IDS } from '@/constants/notificationChannels';

export async function scheduleQuickTimer(
  message: string,
  minutes: number
): Promise<{ notificationId: string; firesAt: Date }> {
  const firesAt = new Date(Date.now() + minutes * 60000);

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Timer',
      body: message.trim() || 'Your timer is up!',
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: { isQuickTimer: true },
      android: {
        channelId: NOTIFICATION_CHANNEL_IDS.timers,
        priority: 'max',
        fullScreenIntent: true,
        ongoing: false,
        sticky: false,
        vibrate: [0, 500, 200, 500],
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: firesAt,
    },
  });

  const scheduledAt = Date.now()
  console.log('[QuickTimer] Scheduled at:', new Date(scheduledAt).toISOString())
  console.log('[QuickTimer] Should fire at:', firesAt.toISOString())
  console.log('[QuickTimer] Delta ms:', firesAt.getTime() - scheduledAt)

  return { notificationId, firesAt };
}

export async function cancelQuickTimer(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
