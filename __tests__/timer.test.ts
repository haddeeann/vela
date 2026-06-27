import * as Notifications from 'expo-notifications';

import {
  buildQuickTimerNotificationRequest,
  buildTimerStopPlan,
  getQuickTimerFiresAt,
  getTimerRemainingMinutes,
} from '../utils/timer';
import { cancelQuickTimer, scheduleQuickTimer } from '../utils/quickTimer';
import { NOTIFICATION_CHANNEL_IDS } from '../constants/notificationChannels';

jest.mock('expo-notifications', () => ({
  AndroidNotificationPriority: {
    MAX: 'max-priority',
  },
  SchedulableTriggerInputTypes: {
    DATE: 'date',
  },
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  dismissNotificationAsync: jest.fn(),
}));

describe('quick timer behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('computes remaining time from the stored end timestamp', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-27T13:00:00.000Z'));

    const firesAt = getQuickTimerFiresAt(Date.now(), 60000);

    expect(getTimerRemainingMinutes(firesAt.getTime(), Date.now())).toBe(1);

    jest.advanceTimersByTime(30000);
    expect(getTimerRemainingMinutes(firesAt.getTime(), Date.now())).toBe(1);

    jest.advanceTimersByTime(30000);
    expect(getTimerRemainingMinutes(firesAt.getTime(), Date.now())).toBeNull();
  });

  it('builds a 60-second quick timer notification from an end timestamp', () => {
    const firesAt = new Date('2026-06-27T13:01:00.000Z');

    expect(
      buildQuickTimerNotificationRequest({
        message: '  ',
        firesAt,
        androidChannelId: NOTIFICATION_CHANNEL_IDS.timers,
        androidPriority: 'max-priority',
        dateTriggerType: 'date',
      })
    ).toEqual({
      content: {
        title: 'Timer',
        body: 'Your timer is up!',
        sound: 'default',
        priority: 'max-priority',
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
        type: 'date',
        date: firesAt,
      },
    });
  });

  it('plans timer stop by cancelling scheduled and dismissing presented notifications', () => {
    expect(buildTimerStopPlan('timer-60s')).toEqual({
      cancelScheduledNotificationIds: ['timer-60s'],
      dismissPresentedNotificationIds: ['timer-60s'],
      shouldClearStoredTimer: true,
    });
  });

  it('stops a 60-second timer by cancelling and dismissing its notification', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-27T13:00:00.000Z'));

    jest
      .mocked(Notifications.scheduleNotificationAsync)
      .mockResolvedValueOnce('timer-60s');
    jest
      .mocked(Notifications.cancelScheduledNotificationAsync)
      .mockResolvedValueOnce(undefined);
    jest
      .mocked(Notifications.dismissNotificationAsync)
      .mockResolvedValueOnce(undefined);

    const result = await scheduleQuickTimer('stand up', 1);
    await cancelQuickTimer(result.notificationId);

    expect(result).toEqual({
      notificationId: 'timer-60s',
      firesAt: new Date('2026-06-27T13:01:00.000Z'),
    });
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: expect.objectContaining({
        title: 'Timer',
        body: 'stand up',
      }),
      trigger: {
        type: 'date',
        date: new Date('2026-06-27T13:01:00.000Z'),
      },
    });
    expect(Notifications.cancelScheduledNotificationAsync)
      .toHaveBeenCalledWith('timer-60s');
    expect(Notifications.dismissNotificationAsync)
      .toHaveBeenCalledWith('timer-60s');
  });
});
