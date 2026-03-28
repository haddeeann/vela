export const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getWeekEnd = (date: Date): Date => {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
};

export const formatWeekRangeLabel = (start: Date, end: Date): string => {
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const startDay = start.getDate();
  const endDay = end.getDate();

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${startMonth} ${startDay} – ${endDay}`;
  }

  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
};

export const getWeeksInMonth = (year: number, month: number): Array<{
  start: Date;
  end: Date;
  label: string;
}> => {
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const firstWeekStart = getWeekStart(monthStart);

  const weeks: Array<{ start: Date; end: Date; label: string }> = [];
  const cursor = new Date(firstWeekStart);

  while (cursor <= monthEnd) {
    const start = new Date(cursor);
    const end = getWeekEnd(start);
    weeks.push({
      start,
      end,
      label: formatWeekRangeLabel(start, end),
    });
    cursor.setDate(cursor.getDate() + 7);
  }

  return weeks;
};
