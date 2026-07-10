export const NOTIFICATION_CHANNEL_VERSION = 2;

export const NOTIFICATION_CHANNEL_VERSION_KEY =
  'vela_notification_channel_version';

export const NOTIFICATION_CHANNEL_IDS = {
  alarms: 'vela-alarms-v2',
  timers: 'vela-timers-v2',
  reminders: 'vela-reminders-v2',
  eventReminders: 'vela-event-reminders-v2',
} as const;

export const LEGACY_NOTIFICATION_CHANNEL_IDS = [
  'vela-alarms',
  'vela-timers',
  'vela-reminders',
] as const;
