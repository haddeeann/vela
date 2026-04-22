import * as Notifications from 'expo-notifications';

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
        channelId: 'vela-timers',
        priority: 'max',
        sound: 'default',
        vibrate: [0, 250, 250, 250],
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: firesAt,
    },
  });

  return { notificationId, firesAt };
}

export async function cancelQuickTimer(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
