export interface Alarm {
  id: string;
  title: string;
  time: string;
  days: number[];
  is_active: boolean;
  notification_ids: string[];
  created_at: number;
}

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DAY_LABELS_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
