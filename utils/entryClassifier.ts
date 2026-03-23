import { EntryType, ConfidenceLevel } from "../types/quickAdd.types"

const anchorSignals = [
  "sleep", "wake", "wakeup", "walk", "eat", "meal", "breakfast", "lunch", 
  "dinner", "supper", "workout", "exercise", "gym", "meditate", 
  "meditation", "routine", "yoga", "run", "running", "jog", "nap", 
  "reading", "journal", "journaling"
]

const externalCommitmentSignals = [
  "meeting", "appointment", "dentist", "doctor", "therapy", 
  "call with", "lunch with", "dinner with", "drinks with", 
  "interview", "flight", "train", "birthday", "party", "concert", 
  "conference", "standup", "sync", "review", "presentation", 
  "class", "lesson", "pickup", "dropoff"
]

const actionVerbs = [
  "buy", "get", "pick up", "call", "email", "send", "write", "read", 
  "finish", "complete", "submit", "book", "schedule", "pay", 
  "clean", "fix", "check", "review", "update", "cancel", "order"
]

export function classifyEntry(
  input: string,
  extracted: {
    date?: string
    startTime?: string
    recurrence?: object
  }
): {
  entryType: EntryType
  confidence: ConfidenceLevel
  needsConfirmation: boolean
  ambiguityReason?: string
} {
  const normalized = input.toLowerCase()
  const hasDateTime = !!(extracted.date && extracted.startTime)
  const hasDateOnly = !!(extracted.date && !extracted.startTime)
  const hasRecurrence = !!extracted.recurrence

  const hasAnchorSignal = anchorSignals.some(s => new RegExp("\\b" + s + "\\b", "i").test(normalized))
  const hasExternalSignal = externalCommitmentSignals.some(s => normalized.includes(s))
  const startsWithActionVerb = actionVerbs.some(v => normalized.trim().startsWith(v))

  // 1. Has concrete date/time + external commitment words → event, high confidence
  if (hasDateTime && hasExternalSignal) {
    return { entryType: 'event', confidence: 'high', needsConfirmation: false }
  }

  // 2. Has recurrence + life/body/routine words → anchor, high confidence
  if (hasRecurrence && hasAnchorSignal) {
    return { entryType: 'anchor', confidence: 'high', needsConfirmation: false }
  }

  // 3. Has recurrence + external commitment words → event, medium confidence, needsConfirmation: true
  if (hasRecurrence && hasExternalSignal) {
    return { entryType: 'event', confidence: 'medium', needsConfirmation: true }
  }

  // 4. No date, no time, starts with action verb → task, high confidence
  if (!extracted.date && !extracted.startTime && startsWithActionVerb) {
    return { entryType: 'task', confidence: 'high', needsConfirmation: false }
  }

  // 5. Has date but no time → event, medium confidence, needsConfirmation: true, ambiguityReason: ...
  if (hasDateOnly) {
    return { 
      entryType: 'event', 
      confidence: 'medium', 
      needsConfirmation: true, 
      ambiguityReason: "No time detected — is this an event or a task?" 
    }
  }

  // 6. Ambiguous (matches both anchor and event signals) → anchor, low confidence, needsConfirmation: true, ambiguityReason: ...
  if (hasAnchorSignal && hasExternalSignal) {
    return { 
      entryType: 'anchor', 
      confidence: 'low', 
      needsConfirmation: true, 
      ambiguityReason: "Could be a recurring event or a life anchor — please confirm" 
    }
  }

  // Default fallback (e.g., "buy groceries")
  if (startsWithActionVerb) {
    return { entryType: 'task', confidence: 'high', needsConfirmation: false }
  }

  return { entryType: 'event', confidence: 'low', needsConfirmation: true }
}
