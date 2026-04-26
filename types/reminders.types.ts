export type ReminderActionId =
  | 'DONE'
  | 'SNOOZE_5_MIN'
  | 'SNOOZE_10_MIN'
  | 'SNOOZE_15_MIN'
  | 'SNOOZE_30_MIN'
  | 'SNOOZE_TOMORROW'
  | 'SKIP_TODAY'
  | 'ON_MY_WAY'
  | 'RUNNING_LATE'
  | 'CANT_MAKE_IT'

export type ReminderSequenceStage =
  | 'warning' // 15 min before
  | 'soon' // 5 min before
  | 'now' // at time
  | 'escalated' // after 2 snoozes

export type NotificationCategoryId =
  | 'REMINDER_EVENT'
  | 'REMINDER_TASK'
  | 'REMINDER_ANCHOR'
  | 'REMINDER_ESCALATED'

export interface ReminderNotificationData {
  entryId: string
  entryType: 'event' | 'task' | 'anchor'
  reminderId: string
  stage: ReminderSequenceStage
  entryTitle: string
}

export interface ScheduledReminderResult {
  warningNotificationId?: string
  soonNotificationId?: string
  nowNotificationId: string
}

// Friendly notification messages by entry type and stage
export const REMINDER_MESSAGES = {
  event: {
    warning: (title: string) =>
      `Heads up — ${title} in 15 minutes. Good time to start wrapping up.`,
    soon: (title: string) =>
      `Almost time. ${title} in 5 minutes.`,
    now: (title: string) =>
      `It's time for ${title}.`,
    escalated: (title: string) =>
      `You've snoozed ${title} twice. Do you still want to do this today?`,
  },
  task: {
    warning: (title: string) =>
      `Reminder: ${title} is coming up.`,
    soon: (title: string) =>
      `${title} — ready to tackle this?`,
    now: (title: string) =>
      `Time to: ${title}`,
    escalated: (title: string) =>
      `You've snoozed "${title}" twice. Want to keep it or move it?`,
  },
  anchor: {
    warning: (title: string) =>
      `Getting close to your ${title} time.`,
    soon: (title: string) =>
      `Almost time for ${title}. Start winding toward it.`,
    now: (title: string) =>
      `Hey — it's your ${title} time. Ready?`,
    escalated: (title: string) =>
      `Skipping ${title} today is okay. Want to skip or try again soon?`,
  },
}
