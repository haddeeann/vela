import { parseDateString } from '../utils/dateUtils'

const mockEvents = [
  {
    id: '1',
    title: 'Morning yoga',
    date: '2026-04-21',
    startTime: '7:00 AM',
    endTime: '8:00 AM',
    entryType: 'anchor',
    categoryId: 'health',
  },
  {
    id: '2',
    title: 'Team standup',
    date: '2026-04-21',
    startTime: '9:00 AM',
    endTime: '9:30 AM',
    entryType: 'event',
    categoryId: 'work',
  },
  {
    id: '3',
    title: 'Dentist',
    date: '2026-04-23',
    startTime: '2:00 PM',
    endTime: '3:00 PM',
    entryType: 'event',
    categoryId: 'health',
  },
]

const filterEventsForDate = (events: any[], date: string) => {
  const target = parseDateString(date)

  return events.filter((event) => {
    const eventDate = parseDateString(event.date)

    return (
      eventDate.getFullYear() === target.getFullYear() &&
      eventDate.getMonth() === target.getMonth() &&
      eventDate.getDate() === target.getDate()
    )
  })
}

describe('event filtering by date', () => {
  it('returns events for the correct date', () => {
    const result = filterEventsForDate(mockEvents, '2026-04-21')
    expect(result.length).toBe(2)
  })

  it('returns empty array for date with no events', () => {
    const result = filterEventsForDate(mockEvents, '2026-04-22')
    expect(result.length).toBe(0)
  })

  it('does not return events from other dates', () => {
    const result = filterEventsForDate(mockEvents, '2026-04-21')
    const titles = result.map((e) => e.title)
    expect(titles).not.toContain('Dentist')
  })

  it('handles date format with and without leading zeros', () => {
    const result1 = filterEventsForDate(mockEvents, '2026-04-21')
    const result2 = filterEventsForDate(mockEvents, '2026-4-21')
    expect(result1.length).toBe(result2.length)
  })
})
