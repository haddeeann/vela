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

interface AnchorEventLike {
  title: string
  entryType?: string
  recurrence?: string
  startTime?: string
  endTime?: string
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

const toDailyWindowSegments = (startHour: number, endHour: number): Array<{ start: number; end: number }> => {
  if (endHour <= startHour) {
    return [
      { start: startHour, end: 24 },
      { start: 0, end: endHour },
    ]
  }
  return [{ start: startHour, end: endHour }]
}

const intersects = (
  left: { start: number; end: number },
  right: { start: number; end: number }
): boolean => left.start < right.end && right.start < left.end

const overlapsWindow = (
  startHour: number,
  endHour: number,
  windowStart: number,
  windowEnd: number
): boolean => {
  const eventSegments = toDailyWindowSegments(startHour, endHour)
  const windowSegments = toDailyWindowSegments(windowStart, windowEnd)
  return eventSegments.some(eventSeg => windowSegments.some(windowSeg => intersects(eventSeg, windowSeg)))
}

const toOvernightAnchor = (anchor: AnchorEventLike): OvernightAnchor | null => {
  if (!anchor.startTime || !anchor.endTime) return null

  const startHour = parseTimeToHours(anchor.startTime)
  const endHour = parseTimeToHours(anchor.endTime)
  return {
    title: anchor.title,
    startTime: anchor.startTime,
    endTime: anchor.endTime,
    startHour,
    endHour,
    isOvernight: endHour < startHour,
  }
}

const anchorSignature = (anchor: OvernightAnchor): string =>
  `${anchor.title}__${anchor.startTime}__${anchor.endTime}`

export const getAnchorsOccupyingWindow = (
  events: AnchorEventLike[],
  windowStart: number = 21,
  windowEnd: number = 5
): OvernightAnchor[] => {
  const anchors = events
    .filter(event => event.entryType === 'anchor' && event.startTime && event.endTime)
    .map(event => toOvernightAnchor(event))
    .filter((anchor): anchor is OvernightAnchor => Boolean(anchor))
    .filter(anchor => overlapsWindow(anchor.startHour, anchor.endHour, windowStart, windowEnd))

  const deduped = new Map<string, OvernightAnchor>()
  for (const anchor of anchors) {
    deduped.set(anchorSignature(anchor), anchor)
  }

  return Array.from(deduped.values()).sort((left, right) =>
    anchorSignature(left).localeCompare(anchorSignature(right))
  )
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
  anchors: OvernightAnchor[];
  reason?: string;
}

export const checkWeeklyOvernightUniformity = (
  weekDays: Date[],
  getEventsForDay: (date: Date) => AnchorEventLike[],
  windowStart: number = 21,
  windowEnd: number = 5
): WeeklyOvernightCheck => {
  const signaturesByDay = weekDays.map(day =>
    getAnchorsOccupyingWindow(getEventsForDay(day), windowStart, windowEnd)
  )

  const firstDayAnchors = signaturesByDay[0] ?? []
  if (firstDayAnchors.length !== 1) {
    return {
      isUniform: false,
      anchor: null,
      anchors: [],
      reason: firstDayAnchors.length === 0
        ? 'No overnight anchor found for each day'
        : 'Multiple anchors occupy the overnight window',
    }
  }

  const firstSignature = anchorSignature(firstDayAnchors[0])
  const isUniform = signaturesByDay.every(dayAnchors =>
    dayAnchors.length === 1 && anchorSignature(dayAnchors[0]) === firstSignature
  )

  if (!isUniform) {
    return {
      isUniform: false,
      anchor: null,
      anchors: [],
      reason: 'Overnight anchors differ across days in this week',
    }
  }

  return {
    isUniform: true,
    anchor: firstDayAnchors[0],
    anchors: firstDayAnchors,
  }
}
