import * as SQLite from 'expo-sqlite';

/**
 * Generate a basic UUID using Math.random() as per requirements.
 * Note: This is a placeholder for a more robust UUID library.
 */
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

let db = null;

/**
 * Initialize the database and create tables if they do not exist.
 */
export const initDB = async () => {
  try {
    if (!db) {
      db = await SQLite.openDatabaseAsync('vela.db');
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

    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

/**
 * Ensures the database is initialized.
 */
const getDB = async () => {
  if (!db) {
    await initDB();
  }
  return db;
};

// Entries

export const createEntry = async (entryData) => {
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

export const getAllEntries = async () => {
  const sqlite = await getDB();
  return await sqlite.getAllAsync(`
    SELECT e.*, em.is_completable, em.completed_at, em.custom_type_name, rr.frequency, rr.end_date, rr.max_occurrences
    FROM entries e
    LEFT JOIN entry_meta em ON e.id = em.entry_id
    LEFT JOIN recurrence_rules rr ON e.id = rr.entry_id
  `);
};

export const getEntriesForDate = async (date) => {
  const sqlite = await getDB();

  // This query gets:
  // 1. All regular entries for that specific date
  // 2. All recurring entries (daily, weekly, monthly)
  // Logic for filtering recurring entries that actually land on this date
  // might be needed in JS, but we fetch them all for the given date context.
  // For now, we'll fetch entries matching the date OR having a recurrence rule.

  const entries = await sqlite.getAllAsync(`
    SELECT e.*, em.is_completable, em.completed_at, em.custom_type_name, rr.frequency, rr.end_date, rr.max_occurrences
    FROM entries e
    LEFT JOIN entry_meta em ON e.id = em.entry_id
    LEFT JOIN recurrence_rules rr ON e.id = rr.entry_id
    WHERE e.date = ? OR rr.id IS NOT NULL
  `, [date]);

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

export const updateEntry = async (id, entryData) => {
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
    is_completable,
    completed_at,
    custom_type_name
  } = entryData;

  await sqlite.withTransactionAsync(async () => {
    // Update entries table
    const entryFields = [];
    const entryValues = [];

    if (title !== undefined) { entryFields.push('title = ?'); entryValues.push(title); }
    if (entry_type !== undefined) { entryFields.push('entry_type = ?'); entryValues.push(entry_type); }
    if (date !== undefined) { entryFields.push('date = ?'); entryValues.push(date); }
    if (start_time !== undefined) { entryFields.push('start_time = ?'); entryValues.push(start_time); }
    if (end_time !== undefined) { entryFields.push('end_time = ?'); entryValues.push(end_time); }
    if (category !== undefined) { entryFields.push('category = ?'); entryValues.push(category); }
    if (notes !== undefined) { entryFields.push('notes = ?'); entryValues.push(notes); }

    if (entryFields.length > 0) {
      entryFields.push('updated_at = ?');
      entryValues.push(now);
      entryValues.push(id);
      await sqlite.runAsync(
        `UPDATE entries SET ${entryFields.join(', ')} WHERE id = ?`,
        entryValues
      );
    }

    // Update entry_meta table
    const metaFields = [];
    const metaValues = [];

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
  });
};

export const deleteEntry = async (id) => {
  const sqlite = await getDB();
  // Cascade manually as requested, even though schema has ON DELETE CASCADE
  await sqlite.withTransactionAsync(async () => {
    await sqlite.runAsync('DELETE FROM reminders WHERE entry_id = ?', [id]);
    await sqlite.runAsync('DELETE FROM recurrence_rules WHERE entry_id = ?', [id]);
    await sqlite.runAsync('DELETE FROM entry_meta WHERE entry_id = ?', [id]);
    await sqlite.runAsync('DELETE FROM entries WHERE id = ?', [id]);
  });
};

// Reminders

export const createReminder = async (entryId, remindBeforeMinutes) => {
  const sqlite = await getDB();
  const id = generateUUID();

  // We need to fetch the entry to calculate scheduled_at
  const entry = await sqlite.getFirstAsync('SELECT date, start_time FROM entries WHERE id = ?', [entryId]);
  if (!entry) throw new Error('Entry not found');

  // Basic calculation for scheduled_at (unix timestamp)
  // Assuming date is YYYY-MM-DD and start_time is HH:MM AM/PM
  const startDateTime = new Date(`${entry.date} ${entry.start_time}`);
  const scheduledAt = Math.floor(startDateTime.getTime() / 1000) - (remindBeforeMinutes * 60);

  await sqlite.runAsync(
    `INSERT INTO reminders (id, entry_id, remind_before_minutes, scheduled_at, is_fired) 
     VALUES (?, ?, ?, ?, 0)`,
    [id, entryId, remindBeforeMinutes, scheduledAt]
  );

  return id;
};

export const getRemindersForEntry = async (entryId) => {
  const sqlite = await getDB();
  return await sqlite.getAllAsync('SELECT * FROM reminders WHERE entry_id = ?', [entryId]);
};

export const markReminderFired = async (reminderId, expoNotificationId) => {
  const sqlite = await getDB();
  await sqlite.runAsync(
    'UPDATE reminders SET is_fired = 1, expo_notification_id = ? WHERE id = ?',
    [expoNotificationId, reminderId]
  );
};

export const deleteRemindersForEntry = async (entryId) => {
  const sqlite = await getDB();
  await sqlite.runAsync('DELETE FROM reminders WHERE entry_id = ?', [entryId]);
};

// Recurrence

export const createRecurrenceRule = async (entryId, frequency, endDate, maxOccurrences) => {
  const sqlite = await getDB();
  const id = generateUUID();
  await sqlite.runAsync(
    `INSERT INTO recurrence_rules (id, entry_id, frequency, end_date, max_occurrences) 
     VALUES (?, ?, ?, ?, ?)`,
    [id, entryId, frequency, endDate, maxOccurrences]
  );
  return id;
};

export const getRecurrenceForEntry = async (entryId) => {
  const sqlite = await getDB();
  return await sqlite.getFirstAsync('SELECT * FROM recurrence_rules WHERE entry_id = ?', [entryId]);
};

export const deleteRecurrenceForEntry = async (entryId) => {
  const sqlite = await getDB();
  await sqlite.runAsync('DELETE FROM recurrence_rules WHERE entry_id = ?', [entryId]);
};

export { db, generateUUID };
