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
