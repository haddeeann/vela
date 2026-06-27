import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';

type NotificationKind = 'alarm' | 'timer' | 'reminder';

const getNotificationKind = (
  data: Record<string, unknown> | undefined
): NotificationKind => {
  if (data?.isQuickTimer) return 'timer';
  if (data?.isAlarm) return 'alarm';
  return 'reminder';
};

export const openNotificationScreen = (
  notification: Notifications.Notification
): void => {
  const content = notification.request.content;
  const data = content.data as Record<string, unknown> | undefined;

  router.replace({
    pathname: '/alarm-screen',
    params: {
      title: String(content.title ?? 'Reminder'),
      body: String(content.body ?? ''),
      type: getNotificationKind(data),
      entryId: String(data?.entryId ?? ''),
      reminderId: String(data?.reminderId ?? ''),
      notificationId: String(notification.request.identifier ?? ''),
      isSnoozed: String(data?.isSnoozed === true),
    },
  });
};
