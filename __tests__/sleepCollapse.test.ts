import { checkWeeklyOvernightUniformity } from '../utils/sleepCollapse';

type AnchorLike = {
  title: string;
  entryType?: string;
  recurrence?: string;
  startTime?: string;
  endTime?: string;
};

const makeWeekDays = (): Date[] => {
  const monday = new Date('2026-07-06T00:00:00.000Z');
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setUTCDate(monday.getUTCDate() + index);
    return date;
  });
};

const dateKey = (date: Date): string => date.toISOString().slice(0, 10);

const buildGetEventsForDay = (eventsByDate: Record<string, AnchorLike[]>) => (date: Date): AnchorLike[] =>
  eventsByDate[dateKey(date)] ?? [];

describe('checkWeeklyOvernightUniformity', () => {
  it('returns uniform when each day has the same overnight anchor', () => {
    const weekDays = makeWeekDays();
    const eventsByDate = Object.fromEntries(
      weekDays.map((day) => [
        dateKey(day),
        [{ title: 'Sleep', entryType: 'anchor', startTime: '9:00 PM', endTime: '5:00 AM' }],
      ])
    );

    const result = checkWeeklyOvernightUniformity(weekDays, buildGetEventsForDay(eventsByDate));

    expect(result.isUniform).toBe(true);
    expect(result.anchor?.title).toBe('Sleep');
    expect(result.anchor?.startTime).toBe('9:00 PM');
    expect(result.anchor?.endTime).toBe('5:00 AM');
  });

  it('returns non-uniform when one day has different anchor times', () => {
    const weekDays = makeWeekDays();
    const eventsByDate = Object.fromEntries(
      weekDays.map((day) => [
        dateKey(day),
        [{ title: 'Sleep', entryType: 'anchor', startTime: '9:00 PM', endTime: '5:00 AM' }],
      ])
    );
    eventsByDate[dateKey(weekDays[2])] = [
      { title: 'Sleep', entryType: 'anchor', startTime: '10:00 PM', endTime: '6:00 AM' },
    ];

    const result = checkWeeklyOvernightUniformity(weekDays, buildGetEventsForDay(eventsByDate));

    expect(result.isUniform).toBe(false);
    expect(result.reason).toBe('Overnight anchors differ across days in this week');
  });

  it('returns non-uniform when a day is missing an overnight anchor', () => {
    const weekDays = makeWeekDays();
    const eventsByDate = Object.fromEntries(
      weekDays.map((day) => [
        dateKey(day),
        [{ title: 'Sleep', entryType: 'anchor', startTime: '9:00 PM', endTime: '5:00 AM' }],
      ])
    );
    eventsByDate[dateKey(weekDays[4])] = [];

    const result = checkWeeklyOvernightUniformity(weekDays, buildGetEventsForDay(eventsByDate));

    expect(result.isUniform).toBe(false);
    expect(result.reason).toBe('Overnight anchors differ across days in this week');
  });

  it('returns non-uniform when one day has split overnight anchors', () => {
    const weekDays = makeWeekDays();
    const eventsByDate = Object.fromEntries(
      weekDays.map((day) => [
        dateKey(day),
        [{ title: 'Sleep', entryType: 'anchor', startTime: '9:00 PM', endTime: '5:00 AM' }],
      ])
    );
    eventsByDate[dateKey(weekDays[1])] = [
      { title: 'Sleep part 1', entryType: 'anchor', startTime: '9:00 PM', endTime: '1:00 AM' },
      { title: 'Sleep part 2', entryType: 'anchor', startTime: '1:00 AM', endTime: '5:00 AM' },
    ];

    const result = checkWeeklyOvernightUniformity(weekDays, buildGetEventsForDay(eventsByDate));

    expect(result.isUniform).toBe(false);
    expect(result.reason).toBe('Overnight anchors differ across days in this week');
  });
});
