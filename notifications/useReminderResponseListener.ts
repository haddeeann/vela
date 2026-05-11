import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';

import {
  ReminderActionId,
} from '../types/reminders.types';
import { handleReminderAction } from './reminderActionHandler';

export const useReminderResponseListener = (
  onShouldRefreshUI: () => void
): void => {
  const hasHandledInitialResponse = useRef(false);

  useEffect(() => {
    const processResponse = async (
      response: Notifications.NotificationResponse
    ): Promise<void> => {
      const actionIdentifier = response.actionIdentifier;
      const notifData = response.notification.request.content.data as Record<string, unknown> | undefined;
      const content = response.notification.request.content;

      if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        // Tapped on the notification itself
        router.replace({
          pathname: '/alarm-screen',
          params: {
            title: String(content.title ?? 'Reminder'),
            body: String(content.body ?? ''),
            type: notifData?.isQuickTimer ? 'timer'
              : notifData?.isAlarm ? 'alarm'
              : 'reminder',
            entryId: String(notifData?.entryId ?? ''),
            reminderId: String(notifData?.reminderId ?? ''),
            notificationId: String(response.notification.request.identifier ?? ''),
          }
        });
        return;
      }

      // If it's a specific action button (like DONE, SNOOZE)
      const result = await handleReminderAction({
        actionId: actionIdentifier as ReminderActionId,
        data: notifData as any,
        currentNotificationId: response.notification.request.identifier,
      });

      if (result.shouldRefreshUI) {
        onShouldRefreshUI();
      }
    };

    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        processResponse(response).catch((error) => {
          console.error('Failed to process notification response', error);
        });
      });

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response || hasHandledInitialResponse.current) {
          return;
        }

        hasHandledInitialResponse.current = true;
        return processResponse(response);
      })
      .catch((error) => {
        console.error('Failed to fetch last notification response', error);
      });

    return () => {
      subscription.remove();
    };
  }, [onShouldRefreshUI]);
};
