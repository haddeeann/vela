import {
  parseDateString,
  formatDateString,
  getWeekStart,
  getWeekEnd,
  getWeeksInMonth,
  formatHourLabel,
} from '../utils/dateUtils'

describe('parseDateString', () => {
  it('parses YYYY-MM-DD as local midnight not UTC', () => {
    const date = parseDateString('2026-07-23')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(6)
    expect(date.getDate()).toBe(23)
  })

  it('handles leading zeros correctly', () => {
    const date = parseDateString('2026-01-05')
    expect(date.getMonth()).toBe(0)
    expect(date.getDate()).toBe(5)
  })

  it('does not shift date due to timezone', () => {
    const date = parseDateString('2026-04-21')
    expect(date.getDate()).toBe(21)
  })
})

describe('formatDateString', () => {
  it('formats a Date as YYYY-MM-DD', () => {
    const date = new Date(2026, 6, 23)
    expect(formatDateString(date)).toBe('2026-07-23')
  })

  it('pads month and day with leading zeros', () => {
    const date = new Date(2026, 0, 5)
    expect(formatDateString(date)).toBe('2026-01-05')
  })

  it('round trips correctly', () => {
    const original = '2026-04-21'
    const result = formatDateString(parseDateString(original))
    expect(result).toBe(original)
  })
})

describe('getWeekStart', () => {
  it('returns Monday for a Wednesday input', () => {
    const wed = new Date(2026, 3, 22)
    const monday = getWeekStart(wed)
    expect(monday.getDay()).toBe(1)
    expect(monday.getDate()).toBe(20)
  })

  it('returns same day for a Monday input', () => {
    const mon = new Date(2026, 3, 20)
    const result = getWeekStart(mon)
    expect(result.getDate()).toBe(20)
  })

  it('returns previous Monday for a Sunday input', () => {
    const sun = new Date(2026, 3, 19)
    const result = getWeekStart(sun)
    expect(result.getDay()).toBe(1)
    expect(result.getDate()).toBe(13)
  })
})

describe('getWeekEnd', () => {
  it('returns Sunday 6 days after week start', () => {
    const wed = new Date(2026, 3, 22)
    const end = getWeekEnd(wed)
    expect(end.getDay()).toBe(0)
    expect(end.getDate()).toBe(26)
  })
})

describe('getWeeksInMonth', () => {
  it('returns at least four weeks with labels for a month', () => {
    const weeks = getWeeksInMonth(2026, 3)
    expect(weeks.length).toBeGreaterThanOrEqual(4)
    expect(weeks[0].label).toBeTruthy()
  })
})

describe('formatHourLabel', () => {
  it('formats midnight as 12 AM', () => {
    expect(formatHourLabel(0)).toBe('12 AM')
  })

  it('formats noon as 12 PM', () => {
    expect(formatHourLabel(12)).toBe('12 PM')
  })

  it('formats 9 as 9 AM', () => {
    expect(formatHourLabel(9)).toBe('9 AM')
  })

  it('formats 13 as 1 PM', () => {
    expect(formatHourLabel(13)).toBe('1 PM')
  })

  it('formats 23 as 11 PM', () => {
    expect(formatHourLabel(23)).toBe('11 PM')
  })
})
