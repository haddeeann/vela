import * as Notifications from 'expo-notifications'
import { NOTIFICATION_CHANNEL_IDS } from '@/constants/notificationChannels'
import { ReminderSequenceStage } from '../types/reminders.types'

export async function snoozeFullScreen(params: {
  title: string
  body: string
  type: string
  entryId?: string
  reminderId?: string
  stage?: ReminderSequenceStage
}): Promise<{ notificationId: string; firesAt: Date }> {

  const firesAt = new Date(Date.now() + 10 * 60 * 1000)

  const channelId = params.type === 'alarm'
    ? NOTIFICATION_CHANNEL_IDS.alarms
    : params.type === 'timer'
    ? NOTIFICATION_CHANNEL_IDS.timers
    : NOTIFICATION_CHANNEL_IDS.reminders

  const notificationId = await
    Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        sound: 'default',
        data: {
          isAlarm: params.type === 'alarm',
          isQuickTimer: params.type === 'timer',
          entryId: params.entryId,
          reminderId: params.reminderId,
          isSnoozed: true,
        },
        android: {
          channelId,
          priority: 'max',
          fullScreenIntent: true,
          vibrate: [0, 500, 200, 500, 200, 500],
        }
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: firesAt,
      }
    })

  return { notificationId, firesAt }
}
