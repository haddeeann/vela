export type ReminderType = 'none' | 'at-time' | '15-min' | '1-hour' | '1-day';

export interface ReminderOption {
  id: ReminderType;
  name: string;
  minutesBefore: number | null;
}

export const REMINDER_OPTIONS: ReminderOption[] = [
  { id: 'none', name: 'None', minutesBefore: null },
  { id: 'at-time', name: 'At time of event', minutesBefore: 0 },
  { id: '15-min', name: '15 minutes before', minutesBefore: 15 },
  { id: '1-hour', name: '1 hour before', minutesBefore: 60 },
  { id: '1-day', name: '1 day before', minutesBefore: 1440 },
];
