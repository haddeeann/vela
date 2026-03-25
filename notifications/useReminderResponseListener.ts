import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';

import {
  ReminderActionId,
  ReminderNotificationData,
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
      const data =
        response.notification.request.content.data as ReminderNotificationData;

      if (!data?.entryId || !data?.reminderId) {
        console.log('Ignoring notification response with missing reminder data', {
          actionIdentifier,
          data,
        });
        return;
      }

      const currentNotificationId = response.notification.request.identifier;

      const result = await handleReminderAction({
        actionId: actionIdentifier as ReminderActionId,
        data,
        currentNotificationId,
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
