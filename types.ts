import { CategoryId } from './constants/categories';
import { RecurrenceType } from './constants/recurrence';

export interface Entry {
  id: string;
  title: string;
  entry_type: 'event' | 'task' | 'anchor' | 'custom';
  date: string; // YYYY-MM-DD
  start_time: string; // Friendly format or HH:MM AM/PM
  end_time: string;
  category: CategoryId;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export interface EntryMeta {
  id: string;
  entry_id: string;
  is_completable: number; // 0 or 1
  completed_at: number | null;
  custom_type_name: string | null;
}

export interface Reminder {
  id: string;
  entry_id: string;
  remind_before_minutes: number;
  scheduled_at: number;
  is_fired: number; // 0 or 1
  expo_notification_id: string | null;
}

export interface RecurrenceRule {
  id: string;
  entry_id: string;
  frequency: RecurrenceType;
  end_date: string | null;
  max_occurrences: number | null;
}

export interface EntryWithMeta extends Entry {
  is_completable: number;
  completed_at: number | null;
  custom_type_name: string | null;
  frequency: RecurrenceType | null;
  end_date: string | null;
  max_occurrences: number | null;
}

export interface CaptureItem {
  id: string;
  title: string;
  created_at: number;
}
