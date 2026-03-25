export type EntryType = 'anchor' | 'event' | 'task'
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly'
export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface ParsedRecurrence {
  frequency: RecurrenceFrequency
  daysOfWeek?: number[]
  endDate?: string
}

export interface QuickAddDraft {
  title: string
  entryType: EntryType
  date?: string
  startTime?: string
  endTime?: string
  recurrence?: ParsedRecurrence
  confidence: ConfidenceLevel
  needsConfirmation: boolean
  ambiguityReason?: string
  rawInput: string
}

export interface QuickAddSaveInput {
  title: string
  entry_type: EntryType
  date: string
  start_time?: string
  end_time?: string
  remind_before_minutes?: number | null
  category: string
  notes?: string
  recurrence?: ParsedRecurrence
}
