import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

import { ReminderActionId } from '@/types/reminders.types';
import { handleReminderAction } from './reminderActionHandler';
import { openNotificationScreen } from './openNotificationScreen';

export const useRootNotificationListeners = (): void => {
  const hasHandledInitialResponse = useRef(false);

  useEffect(() => {
    const handleResponse = async (
      response: Notifications.NotificationResponse
    ): Promise<void> => {
      if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        openNotificationScreen(response.notification);
        return;
      }

      const data = response.notification.request.content.data;

      await handleReminderAction({
        actionId: response.actionIdentifier as ReminderActionId,
        data: data as any,
        currentNotificationId: response.notification.request.identifier,
      });
    };

    const receivedSubscription =
      Notifications.addNotificationReceivedListener((notification) => {
        openNotificationScreen(notification);
      });

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        handleResponse(response).catch((error) => {
          console.error('Failed to process notification response', error);
        });
      });

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response || hasHandledInitialResponse.current) return;
        hasHandledInitialResponse.current = true;
        return handleResponse(response);
      })
      .catch((error) => {
        console.error('Failed to fetch last notification response', error);
      });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);
};
