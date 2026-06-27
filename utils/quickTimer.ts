import * as Notifications from 'expo-notifications';
import { NOTIFICATION_CHANNEL_IDS } from '@/constants/notificationChannels';
import {
  buildQuickTimerNotificationRequest,
  buildTimerStopPlan,
  getQuickTimerFiresAt,
} from '@/utils/timer';

export async function scheduleQuickTimer(
  message: string,
  minutes: number
): Promise<{ notificationId: string; firesAt: Date }> {
  const scheduledAt = Date.now()
  const firesAt = getQuickTimerFiresAt(scheduledAt, minutes * 60000);

  const notificationId = await Notifications.scheduleNotificationAsync({
    ...buildQuickTimerNotificationRequest({
      message,
      firesAt,
      androidChannelId: NOTIFICATION_CHANNEL_IDS.timers,
      androidPriority: Notifications.AndroidNotificationPriority.MAX,
      dateTriggerType: Notifications.SchedulableTriggerInputTypes.DATE,
    }),
  });

  console.log('[QuickTimer] Scheduled at:', new Date(scheduledAt).toISOString())
  console.log('[QuickTimer] Should fire at:', firesAt.toISOString())
  console.log('[QuickTimer] Delta ms:', firesAt.getTime() - scheduledAt)

  return { notificationId, firesAt };
}

export async function cancelQuickTimer(notificationId: string): Promise<void> {
  const stopPlan = buildTimerStopPlan(notificationId);

  await Promise.all([
    ...stopPlan.cancelScheduledNotificationIds.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {})
    ),
    ...stopPlan.dismissPresentedNotificationIds.map((id) =>
      Notifications.dismissNotificationAsync(id).catch(() => {})
    ),
  ]);
}
