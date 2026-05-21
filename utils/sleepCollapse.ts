export interface SleepRange {
  startHour: number
  endHour: number
  label: string
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
