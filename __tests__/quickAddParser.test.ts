import { parseQuickAdd } from '../utils/quickAddParser'

describe('parseQuickAdd — entry type classification', () => {
  it('classifies sleep as anchor', () => {
    const result = parseQuickAdd('sleep every day 10:30pm to 6:30am')
    expect(result.entryType).toBe('anchor')
  })

  it('classifies dog walk as anchor', () => {
    const result = parseQuickAdd('dog walk every day at 7am')
    expect(result.entryType).toBe('anchor')
  })

  it('classifies dentist as event', () => {
    const result = parseQuickAdd('dentist Thursday at 2pm')
    expect(result.entryType).toBe('event')
  })

  it('classifies dinner with friend as event', () => {
    const result = parseQuickAdd('dinner with Ana Friday 7pm')
    expect(result.entryType).toBe('event')
  })

  it('classifies buy groceries as task', () => {
    const result = parseQuickAdd('buy groceries')
    expect(result.entryType).toBe('task')
  })

  it('classifies buy groceries tomorrow as event', () => {
    const result = parseQuickAdd('buy groceries tomorrow')
    expect(result.entryType).toBe('event')
  })

  it('classifies team meeting as event even though recurring', () => {
    const result = parseQuickAdd('team meeting every Monday at 10')
    expect(result.entryType).toBe('event')
  })
})

describe('parseQuickAdd — time extraction', () => {
  it('extracts start time from input', () => {
    const result = parseQuickAdd('dentist at 2pm')
    expect(result.startTime).toBeTruthy()
  })

  it('extracts both times from range', () => {
    const result = parseQuickAdd('sleep 10:30pm to 6:30am')
    expect(result.startTime).toBeTruthy()
    expect(result.endTime).toBeTruthy()
  })

  it('extracts overnight range with from/to', () => {
    const result = parseQuickAdd('Sleep from 9pm to 5am daily')
    expect(result.startTime).toMatch(/9.*PM/i)
    expect(result.endTime).toMatch(/5.*AM/i)
    expect(result.recurrence?.frequency).toBe('daily')
    expect(result.entryType).toBe('anchor')
    expect(result.title).toBe('Sleep')
  })
})

describe('parseQuickAdd — recurrence', () => {
  it('detects daily recurrence', () => {
    const result = parseQuickAdd('walk dogs every day at 7am')
    expect(result.recurrence?.frequency).toBe('daily')
  })

  it('detects weekly recurrence', () => {
    const result = parseQuickAdd('team meeting every Monday')
    expect(result.recurrence?.frequency).toBe('weekly')
  })
})

describe('parseQuickAdd — title cleaning', () => {
  it('removes time tokens from title', () => {
    const result = parseQuickAdd('dentist Thursday at 2pm')
    expect(result.title.toLowerCase()).not.toContain('2pm')
    expect(result.title.toLowerCase()).toContain('dentist')
  })

  it('capitalizes first letter of title', () => {
    const result = parseQuickAdd('buy groceries')
    expect(result.title[0]).toBe(result.title[0].toUpperCase())
  })
})
