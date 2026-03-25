import { initDB } from '../db';

export const markEntryComplete = async (entryId: string): Promise<void> => {
  const db = await initDB();
  await db.runAsync(
    'UPDATE entry_meta SET completed_at = ? WHERE entry_id = ?',
    [Date.now(), entryId]
  );
};

export const isEntryCompletable = async (entryId: string): Promise<boolean> => {
  const db = await initDB();
  const row = await db.getFirstAsync('SELECT is_completable FROM entry_meta WHERE entry_id = ?', [entryId]) as
    | { is_completable: number | null }
    | undefined;

  return row?.is_completable === 1;
};

export const moveEntryToTomorrow = async (entryId: string): Promise<void> => {
  const db = await initDB();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = tomorrow.toISOString().slice(0, 10);

  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE entries SET date = ? WHERE id = ?', [tomorrowDate, entryId]);
    await db.runAsync('UPDATE reminders SET is_fired = 0 WHERE entry_id = ?', [entryId]);
  });
};
