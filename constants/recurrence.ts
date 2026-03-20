export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';

export const RECURRENCE_OPTIONS: { id: RecurrenceType; name: string }[] = [
  { id: 'none', name: 'None' },
  { id: 'daily', name: 'Daily' },
  { id: 'weekly', name: 'Weekly' },
  { id: 'monthly', name: 'Monthly' },
];
