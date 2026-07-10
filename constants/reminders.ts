export type ReminderType =
  | 'use-default'
  | 'none'
  | 'at-start'
  | '5-min'
  | '10-min'
  | '30-min'
  | '1-hour';

export interface ReminderOption {
  id: ReminderType;
  name: string;
  minutesBefore: number | null;
}

export const REMINDER_OPTIONS: ReminderOption[] = [
  { id: 'use-default', name: 'Use default', minutesBefore: null },
  { id: 'none', name: 'None', minutesBefore: null },
  { id: 'at-start', name: 'At start time', minutesBefore: 0 },
  { id: '5-min', name: '5 minutes before', minutesBefore: 5 },
  { id: '10-min', name: '10 minutes before', minutesBefore: 10 },
  { id: '30-min', name: '30 minutes before', minutesBefore: 30 },
  { id: '1-hour', name: '1 hour before', minutesBefore: 60 },
];

export const DEFAULT_REMINDER_OPTIONS: ReminderOption[] = REMINDER_OPTIONS.filter(
  (option) => option.id !== 'use-default'
);
