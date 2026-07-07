export interface SleepRange {
  startHour: number
  endHour: number
  label: string
  isOvernight: boolean
}

export interface OvernightAnchor {
  title: string
  startTime: string
  endTime: string
  startHour: number
  endHour: number
  isOvernight: boolean
}

const parseTimeToHours = (time: string): number => {
  if (!time || !time.trim()) return 0
  const cleaned = time.trim().toUpperCase()
  const isPM = cleaned.includes('PM')
  const isAM = cleaned.includes('AM')
  const timePart = cleaned
    .replace('AM', '')
    .replace('PM', '')
    .trim()
  const [hourStr, minuteStr] = timePart.split(':')
  let hours = parseInt(hourStr, 10)
  const minutes = parseInt(minuteStr ?? '0', 10)
  if (isNaN(hours)) return 0
  if (isPM && hours < 12) hours += 12
  if (isAM && hours === 12) hours = 0
  return hours + minutes / 60
}

export const findSleepAnchor = (
  events: Array<{
    title: string
    entryType?: string
    recurrence?: string
    startTime?: string
    endTime?: string
  }>
): SleepRange | null => {
  const sleep = events.find(e =>
    e.entryType === 'anchor' &&
    e.title.toLowerCase().includes('sleep') &&
    (e.recurrence === 'daily' ||
     e.recurrence === 'none')
  )

  if (!sleep?.startTime || !sleep?.endTime)
    return null

  const startHour = parseTimeToHours(sleep.startTime)
  const endHour = parseTimeToHours(sleep.endTime)

  return {
    startHour,
    endHour,
    label: sleep.title,
    isOvernight: endHour < startHour,
  }
}

const overlapsOvernightWindow = (
  startHour: number,
  endHour: number,
  windowStart: number,
  windowEnd: number
): boolean => {
  const isOvernight = endHour < startHour;
  
  if (isOvernight) {
    if (windowEnd < windowStart) {
      return true;
    }
    return startHour <= windowStart || endHour >= windowEnd;
  }
  
  if (windowEnd < windowStart) {
    return (startHour >= windowStart || endHour <= windowEnd) &&
           (startHour < endHour);
  }
  
  return startHour < windowEnd && endHour > windowStart;
}

export const findOvernightAnchor = (
  events: Array<{
    title: string
    entryType?: string
    recurrence?: string
    startTime?: string
    endTime?: string
  }>,
  windowStart: number = 21,
  windowEnd: number = 5
): OvernightAnchor | null => {
  const anchor = events.find(e => {
    if (e.entryType !== 'anchor') return false;
    if (!e.startTime || !e.endTime) return false;
    
    const startHour = parseTimeToHours(e.startTime);
    const endHour = parseTimeToHours(e.endTime);
    
    return overlapsOvernightWindow(startHour, endHour, windowStart, windowEnd);
  });

  if (!anchor?.startTime || !anchor?.endTime) return null;

  const startHour = parseTimeToHours(anchor.startTime);
  const endHour = parseTimeToHours(anchor.endTime);

  return {
    title: anchor.title,
    startTime: anchor.startTime,
    endTime: anchor.endTime,
    startHour,
    endHour,
    isOvernight: endHour < startHour,
  };
}

export const isHourInSleepRange = (
  hour: number,
  sleep: SleepRange
): boolean => {
  if (sleep.isOvernight) {
    return hour >= Math.floor(sleep.startHour) ||
           hour < Math.ceil(sleep.endHour)
  }
  return hour >= Math.floor(sleep.startHour) &&
         hour < Math.ceil(sleep.endHour)
}

export interface WeeklyOvernightCheck {
  isUniform: boolean;
  anchor: OvernightAnchor | null;
  reason?: string;
}

export const checkWeeklyOvernightUniformity = (
  weekDays: Date[],
  getEventsForDay: (date: Date) => Array<{
    title: string
    entryType?: string
    recurrence?: string
    startTime?: string
    endTime?: string
  }>,
  windowStart: number = 21,
  windowEnd: number = 5
): WeeklyOvernightCheck => {
  const dailyAnchors: Array<OvernightAnchor | null> = [];
  
  for (const day of weekDays) {
    const dayEvents = getEventsForDay(day);
    const anchor = findOvernightAnchor(dayEvents, windowStart, windowEnd);
    dailyAnchors.push(anchor);
  }
  
  const firstAnchor = dailyAnchors[0];
  if (!firstAnchor) {
    return {
      isUniform: false,
      anchor: null,
      reason: 'No overnight anchor on first day',
    };
  }
  
  const allMatch = dailyAnchors.every(anchor => {
    if (!anchor) return false;
    return (
      anchor.title === firstAnchor.title &&
      anchor.startTime === firstAnchor.startTime &&
      anchor.endTime === firstAnchor.endTime
    );
  });
  
  if (!allMatch) {
    return {
      isUniform: false,
      anchor: firstAnchor,
      reason: 'Overnight times vary across the week',
    };
  }
  
  return {
    isUniform: true,
    anchor: firstAnchor,
  };
}
