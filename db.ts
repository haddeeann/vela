import * as SQLite from 'expo-sqlite';
import { Entry, EntryWithMeta, Reminder, RecurrenceRule } from './types';
import { CategoryId } from './constants/categories';
import { RecurrenceType } from './constants/recurrence';
import { QuickAddSaveInput } from './types/quickAdd.types';
import { scheduleReminderSequence, cancelReminderNotifications } from './notifications/scheduleReminderSequence';

/**
 * Generate a basic UUID using Math.random() as per requirements.
 * Note: This is a placeholder for a more robust UUID library.
 */
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

let db: SQLite.SQLiteDatabase | null = null;
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Initialize the database and create tables if they do not exist.
 */
export const initDB = async (): Promise<SQLite.SQLiteDatabase> => {
  // If we already have a promise, wait for it.
  if (dbPromise) {
    try {
      return await dbPromise;
    } catch (e) {
      // If it failed, we'll try to re-initialize below
    }
  }

  dbPromise = (async () => {
    try {
      if (!db) {
        // Handle potential Transient sqlite3_open_v2 errors on web
        let lastError: Error | undefined;
        for (let i = 0; i < 3; i++) {
          try {
            db = await SQLite.openDatabaseAsync('vela.db');
            break;
          } catch (e) {
            lastError = e as Error;
            if (lastError.message?.includes('sqlite3_open_v2')) {
              console.warn(`Database open attempt ${i + 1} failed, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
              continue;
            }
            throw e;
          }
        }
        if (!db) throw lastError;
      }

      // Enable foreign keys
      await db.execAsync('PRAGMA foreign_keys = ON;');

      // Create entries table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS entries (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          entry_type TEXT CHECK(entry_type IN ('event', 'task', 'anchor', 'custom')) NOT NULL,
          date TEXT NOT NULL,
          start_time TEXT NOT NULL,
          end_time TEXT NOT NULL,
          category TEXT CHECK(category IN ('work', 'personal', 'health', 'social', 'other')) NOT NULL,
          notes TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
      `);

      // Create entry_meta table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS entry_meta (
          id TEXT PRIMARY KEY NOT NULL,
          entry_id TEXT NOT NULL,
          is_completable INTEGER DEFAULT 0,
          completed_at INTEGER,
          custom_type_name TEXT,
          FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
        );
      `);

      // Create reminders table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS reminders (
          id TEXT PRIMARY KEY NOT NULL,
          entry_id TEXT NOT NULL,
          remind_before_minutes INTEGER NOT NULL,
          scheduled_at INTEGER NOT NULL,
          is_fired INTEGER DEFAULT 0,
          expo_notification_id TEXT,
          FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
        );
      `);

      // Create recurrence_rules table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS recurrence_rules (
          id TEXT PRIMARY KEY NOT NULL,
          entry_id TEXT NOT NULL,
          frequency TEXT CHECK(frequency IN ('daily', 'weekly', 'monthly')) NOT NULL,
          end_date TEXT,
          max_occurrences INTEGER,
          FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
        );
      `);

      await db.execAsync(`
        ALTER TABLE reminders 
        ADD COLUMN snooze_count INTEGER DEFAULT 0
      `).catch(() => {})

      console.log('Database initialized successfully');
      return db;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      dbPromise = null; // Reset promise so we can retry on next call
      db = null; // Also reset db instance
      throw error;
    }
  })();

  return dbPromise;
};

/**
 * Ensures the database is initialized.
 */
const getDB = async (): Promise<SQLite.SQLiteDatabase> => {
  return initDB();
};

// Entries

export interface CreateEntryData {
  title: string;
  entry_type: 'event' | 'task' | 'anchor' | 'custom';
  date: string;
  start_time: string;
  end_time: string;
  category: CategoryId;
  notes?: string | null;
  is_completable?: number;
  custom_type_name?: string | null;
}

export const createEntry = async (entryData: CreateEntryData): Promise<{ id: string; metaId: string }> => {
  const sqlite = await getDB();
  const id = generateUUID();
  const metaId = generateUUID();
  const now = Math.floor(Date.now() / 1000);

  const {
    title,
    entry_type,
    date,
    start_time,
    end_time,
    category,
    notes = null,
    is_completable = 0,
    custom_type_name = null
  } = entryData;

  await sqlite.withTransactionAsync(async () => {
    await sqlite.runAsync(
      `INSERT INTO entries (id, title, entry_type, date, start_time, end_time, category, notes, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, title, entry_type, date, start_time, end_time, category, notes, now, now]
    );

    await sqlite.runAsync(
      `INSERT INTO entry_meta (id, entry_id, is_completable, completed_at, custom_type_name) 
       VALUES (?, ?, ?, ?, ?);`,
      [metaId, id, is_completable, null, custom_type_name]
    );
  });

  return { id, metaId };
};

export const getAllEntries = async (): Promise<EntryWithMeta[]> => {
  const sqlite = await getDB();
  const rows = await sqlite.getAllAsync(`
    SELECT e.*, em.is_completable, em.completed_at, em.custom_type_name, rr.frequency, rr.end_date, rr.max_occurrences
    FROM entries e
    LEFT JOIN entry_meta em ON e.id = em.entry_id
    LEFT JOIN recurrence_rules rr ON e.id = rr.entry_id
  `);
  return rows as EntryWithMeta[];
};

export const getEntriesForDate = async (date: string): Promise<EntryWithMeta[]> => {
  const sqlite = await getDB();

  // This query gets:
  // 1. All regular entries for that specific date
  // 2. All recurring entries (daily, weekly, monthly)
  // Logic for filtering recurring entries that actually land on this date
  // might be needed in JS, but we fetch them all for the given date context.
  // For now, we'll fetch entries matching the date OR having a recurrence rule.

  const rows = await sqlite.getAllAsync(`
    SELECT e.*, em.is_completable, em.completed_at, em.custom_type_name, rr.frequency, rr.end_date, rr.max_occurrences
    FROM entries e
    LEFT JOIN entry_meta em ON e.id = em.entry_id
    LEFT JOIN recurrence_rules rr ON e.id = rr.entry_id
    WHERE e.date = ? OR rr.id IS NOT NULL
  `, [date]);

  const entries = rows as EntryWithMeta[];

  // JS filtering for recurring entries
  return entries.filter(entry => {
    if (entry.date === date) return true;
    if (!entry.frequency) return false;

    const entryDate = new Date(entry.date);
    const targetDate = new Date(date);

    if (targetDate < entryDate) return false;
    if (entry.end_date && targetDate > new Date(entry.end_date)) return false;

    // Check recurrence rules
    if (entry.frequency === 'daily') return true;
    if (entry.frequency === 'weekly') {
      return entryDate.getDay() === targetDate.getDay();
    }
    if (entry.frequency === 'monthly') {
      return entryDate.getDate() === targetDate.getDate();
    }

    return false;
  });
};

export interface UpdateEntryData {
  title?: string;
  entry_type?: 'event' | 'task' | 'anchor' | 'custom';
  date?: string;
  start_time?: string;
  end_time?: string;
  category?: CategoryId;
  notes?: string | null;
  recurrence?: {
    frequency: RecurrenceType;
    end_date?: string | null;
  } | null;
  is_completable?: number;
  completed_at?: number | null;
  custom_type_name?: string | null;
}

export const updateEntry = async (id: string, entryData: UpdateEntryData): Promise<void> => {
  const sqlite = await getDB();
  const now = Math.floor(Date.now() / 1000);

  const {
    title,
    entry_type,
    date,
    start_time,
    end_time,
    category,
    notes,
    recurrence,
    is_completable,
    completed_at,
    custom_type_name
  } = entryData;

  await sqlite.withTransactionAsync(async () => {
    // Update entries table
    const entryFields: string[] = [];
    const entryValues: (string | number | null)[] = [];

    if (title !== undefined) { entryFields.push('title = ?'); entryValues.push(title); }
    if (entry_type !== undefined) { entryFields.push('entry_type = ?'); entryValues.push(entry_type); }
    if (date !== undefined) { entryFields.push('date = ?'); entryValues.push(date); }
    if (start_time !== undefined) { entryFields.push('start_time = ?'); entryValues.push(start_time); }
    if (end_time !== undefined) { entryFields.push('end_time = ?'); entryValues.push(end_time); }
    if (category !== undefined) { entryFields.push('category = ?'); entryValues.push(category); }
    if (notes !== undefined) { entryFields.push('notes = ?'); entryValues.push(notes); }

    entryFields.push('updated_at = ?');
    entryValues.push(now);
    entryValues.push(id);
    await sqlite.runAsync(
      `UPDATE entries SET ${entryFields.join(', ')} WHERE id = ?`,
      entryValues
    );

    // Update entry_meta table
    const metaFields: string[] = [];
    const metaValues: (string | number | null)[] = [];

    if (is_completable !== undefined) { metaFields.push('is_completable = ?'); metaValues.push(is_completable); }
    if (completed_at !== undefined) { metaFields.push('completed_at = ?'); metaValues.push(completed_at); }
    if (custom_type_name !== undefined) { metaFields.push('custom_type_name = ?'); metaValues.push(custom_type_name); }

    if (metaFields.length > 0) {
      metaValues.push(id);
      await sqlite.runAsync(
        `UPDATE entry_meta SET ${metaFields.join(', ')} WHERE entry_id = ?`,
        metaValues
      );
    }

    if (recurrence !== undefined) {
      if (recurrence && recurrence.frequency !== 'none') {
        const existingRule = await sqlite.getFirstAsync(
          'SELECT id FROM recurrence_rules WHERE entry_id = ?',
          [id]
        ) as { id: string } | null;

        if (existingRule) {
          await sqlite.runAsync(
            'UPDATE recurrence_rules SET frequency = ?, end_date = ? WHERE entry_id = ?',
            [recurrence.frequency, recurrence.end_date ?? null, id]
          );
        } else {
          await sqlite.runAsync(
            'INSERT INTO recurrence_rules (id, entry_id, frequency, end_date, max_occurrences) VALUES (?, ?, ?, ?, ?)',
            [generateUUID(), id, recurrence.frequency, recurrence.end_date ?? null, null]
          );
        }
      } else {
        await sqlite.runAsync('DELETE FROM recurrence_rules WHERE entry_id = ?', [id]);
      }
    }
  });
};

export const deleteEntry = async (id: string): Promise<void> => {
  const sqlite = await getDB();

  const reminderRows = await sqlite.getAllAsync(
    'SELECT expo_notification_id FROM reminders WHERE entry_id = ?',
    [id]
  ) as Array<{ expo_notification_id: string | null }>;

  const notificationIds = reminderRows
    .map((row) => row.expo_notification_id)
    .filter((notificationId): notificationId is string => Boolean(notificationId));

  if (notificationIds.length > 0) {
    await cancelReminderNotifications(notificationIds);
  }

  // Cascade manually as requested, even though schema has ON DELETE CASCADE
  await sqlite.withTransactionAsync(async () => {
    await sqlite.runAsync('DELETE FROM reminders WHERE entry_id = ?', [id]);
    await sqlite.runAsync('DELETE FROM recurrence_rules WHERE entry_id = ?', [id]);
    await sqlite.runAsync('DELETE FROM entry_meta WHERE entry_id = ?', [id]);
    await sqlite.runAsync('DELETE FROM entries WHERE id = ?', [id]);
  });
};

// Reminders

export const createReminder = async (entryId: string, remindBeforeMinutes: number): Promise<string> => {
  const sqlite = await getDB();
  const id = generateUUID();

  // We need to fetch the entry to calculate scheduled_at
  const entry = await sqlite.getFirstAsync('SELECT date, start_time FROM entries WHERE id = ?', [entryId]) as { date: string; start_time: string } | null;
  if (!entry) throw new Error('Entry not found');

  // Basic calculation for scheduled_at (unix timestamp)
  // Assuming date is YYYY-MM-DD and start_time is HH:MM AM/PM
  let startDateTime;
  if (entry.start_time && entry.start_time.trim() !== '') {
    // Attempt to parse "YYYY-MM-DD HH:MM AM/PM"
    const [time, period] = entry.start_time.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    startDateTime = new Date(entry.date);
    startDateTime.setHours(hours, minutes, 0, 0);
  } else {
    // Fallback to start of day if no time is provided
    startDateTime = new Date(`${entry.date}T00:00:00`);
  }

  const timestamp = startDateTime.getTime();
  if (isNaN(timestamp)) {
    throw new Error(`Invalid date calculation for entry ${entryId}: ${entry.date} ${entry.start_time}`);
  }

  const scheduledAt = Math.floor(timestamp / 1000) - (remindBeforeMinutes * 60);

  await sqlite.runAsync(
    `INSERT INTO reminders (id, entry_id, remind_before_minutes, scheduled_at, is_fired) 
     VALUES (?, ?, ?, ?, 0)`,
    [id, entryId, remindBeforeMinutes, scheduledAt]
  );

  return id;
};

export const getRemindersForEntry = async (entryId: string): Promise<Reminder[]> => {
  const sqlite = await getDB();
  const rows = await sqlite.getAllAsync('SELECT * FROM reminders WHERE entry_id = ?', [entryId]);
  return rows as Reminder[];
};

export const markReminderFired = async (reminderId: string, expoNotificationId: string): Promise<void> => {
  const sqlite = await getDB();
  await sqlite.runAsync(
    'UPDATE reminders SET is_fired = 1, expo_notification_id = ? WHERE id = ?',
    [expoNotificationId, reminderId]
  );
};

export const deleteRemindersForEntry = async (entryId: string): Promise<void> => {
  const sqlite = await getDB();
  await sqlite.runAsync('DELETE FROM reminders WHERE entry_id = ?', [entryId]);
};

// Recurrence

export const createRecurrenceRule = async (entryId: string, frequency: RecurrenceType, endDate: string | null, maxOccurrences: number | null): Promise<string> => {
  const sqlite = await getDB();
  const id = generateUUID();
  await sqlite.runAsync(
    `INSERT INTO recurrence_rules (id, entry_id, frequency, end_date, max_occurrences) 
     VALUES (?, ?, ?, ?, ?)`,
    [id, entryId, frequency, endDate, maxOccurrences]
  );
  return id;
};

export const getRecurrenceForEntry = async (entryId: string): Promise<RecurrenceRule | null> => {
  const sqlite = await getDB();
  const row = await sqlite.getFirstAsync('SELECT * FROM recurrence_rules WHERE entry_id = ?', [entryId]);
  return row as RecurrenceRule | null;
};

export const deleteRecurrenceForEntry = async (entryId: string): Promise<void> => {
  const sqlite = await getDB();
  await sqlite.runAsync('DELETE FROM recurrence_rules WHERE entry_id = ?', [entryId]);
};

/**
 * Save a quick add entry to the database.
 */
export const saveQuickAddEntry = async (input: QuickAddSaveInput): Promise<string> => {
  try {
    const sqlite = await getDB();
    const id = generateUUID();
    const metaId = generateUUID();
    const recurrenceId = generateUUID();
    const now = Date.now();

    const {
      title,
      entry_type,
      date,
      start_time = '',
      end_time = '',
      category = 'personal',
      notes = null,
      recurrence,
      remind_before_minutes = null,
    } = input;

    let reminderId: string | null = null;
    let scheduledAt: number | null = null;

    await sqlite.withTransactionAsync(async () => {
      // 4. Insert a row into the entries table
      await sqlite.runAsync(
        `INSERT INTO entries (id, title, entry_type, date, start_time, end_time, category, notes, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [id, title, entry_type, date, start_time, end_time, category, notes, now, now]
      );

      // 5. Insert a row into entry_meta
      const is_completable = entry_type === 'task' ? 1 : 0;
      await sqlite.runAsync(
        `INSERT INTO entry_meta (id, entry_id, is_completable, completed_at) 
         VALUES (?, ?, ?, ?);`,
        [metaId, id, is_completable, null]
      );

      // 6. If input.recurrence exists, insert into recurrence_rules
      if (recurrence) {
        await sqlite.runAsync(
          `INSERT INTO recurrence_rules (id, entry_id, frequency, end_date, max_occurrences) 
           VALUES (?, ?, ?, ?, ?);`,
          [recurrenceId, id, recurrence.frequency, recurrence.endDate || null, null]
        );
      }

      if (typeof remind_before_minutes === 'number') {
        reminderId = generateUUID();

        const entryDateTime = new Date(date);
        if (start_time && start_time.trim() !== '') {
          const [time, period] = start_time.split(' ');
          let [hours, minutes] = time.split(':').map(Number);
          if (period === 'PM' && hours < 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          entryDateTime.setHours(hours, minutes, 0, 0);
        } else {
          entryDateTime.setHours(0, 0, 0, 0);
        }

        scheduledAt = entryDateTime.getTime() - remind_before_minutes * 60 * 1000;

        await sqlite.runAsync(
          `INSERT INTO reminders (id, entry_id, remind_before_minutes, scheduled_at, is_fired)
           VALUES (?, ?, ?, ?, 0);`,
          [reminderId, id, remind_before_minutes, scheduledAt]
        );
      }
    });

    if (reminderId && scheduledAt !== null) {
      const result = await scheduleReminderSequence({
        reminderId,
        entryId: id,
        entryType: entry_type,
        entryTitle: title,
        scheduledAt,
      });

      await sqlite.runAsync(
        'UPDATE reminders SET expo_notification_id = ? WHERE id = ?',
        [result.nowNotificationId, reminderId]
      );
    }

    return id;
  } catch (error) {
    console.error('Error in saveQuickAddEntry:', error);
    throw error;
  }
};

export { db, generateUUID };
