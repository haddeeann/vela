export const QUICK_TIMER_DEFAULT_MESSAGE = 'Your timer is up!';
export const TIMER_STORAGE_KEY = 'vela_active_timer';

export type TimerStopPlan = {
  cancelScheduledNotificationIds: string[];
  dismissPresentedNotificationIds: string[];
  shouldClearStoredTimer: boolean;
};

export type QuickTimerNotificationRequest = {
  content: {
    title: string;
    body: string;
    sound: string;
    priority: unknown;
    data: { isQuickTimer: true };
    android: {
      channelId: string;
      priority: 'max';
      fullScreenIntent: true;
      ongoing: false;
      sticky: false;
      vibrate: number[];
    };
  };
  trigger: {
    type: unknown;
    date: Date;
  };
};

export const getQuickTimerFiresAt = (
  nowMs: number,
  durationMs: number
): Date => new Date(nowMs + durationMs);

export const getTimerRemainingMinutes = (
  firesAtMs: number,
  nowMs: number
): number | null => {
  const remainingMs = firesAtMs - nowMs;
  if (remainingMs <= 0) return null;
  return Math.ceil(remainingMs / 60000);
};

export const buildQuickTimerNotificationRequest = ({
  message,
  firesAt,
  androidChannelId,
  androidPriority,
  dateTriggerType,
}: {
  message: string;
  firesAt: Date;
  androidChannelId: string;
  androidPriority: unknown;
  dateTriggerType: unknown;
}): QuickTimerNotificationRequest => ({
  content: {
    title: 'Timer',
    body: message.trim() || QUICK_TIMER_DEFAULT_MESSAGE,
    sound: 'default',
    priority: androidPriority,
    data: { isQuickTimer: true },
    android: {
      channelId: androidChannelId,
      priority: 'max',
      fullScreenIntent: true,
      ongoing: false,
      sticky: false,
      vibrate: [0, 500, 200, 500],
    },
  },
  trigger: {
    type: dateTriggerType,
    date: firesAt,
  },
});

export const buildTimerStopPlan = (
  notificationId?: string | null
): TimerStopPlan => {
  const notificationIds = notificationId ? [notificationId] : [];

  return {
    cancelScheduledNotificationIds: notificationIds,
    dismissPresentedNotificationIds: notificationIds,
    shouldClearStoredTimer: true,
  };
};
