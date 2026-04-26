import { QuickAddDraft } from "../types/quickAdd.types"
import { extractDateTime } from "./dateTimeExtractor"
import { classifyEntry } from "./entryClassifier"

/**
 * Parses a raw input string into a QuickAddDraft.
 * Integrates date/time extraction and entry classification.
 */
export function parseQuickAdd(rawInput: string): QuickAddDraft {
  const trimmedInput = rawInput.trim()
  const lowercasedInput = trimmedInput.toLowerCase()

  // 1. Extract date, time, and recurrence
  const extracted = extractDateTime(lowercasedInput)

  // 2. Classify entry
  const classification = classifyEntry(lowercasedInput, extracted)

  // 3. Build the title by removing detected tokens
  let title = trimmedInput

  // Tokens to remove (case-insensitive)
  const dateTokens = [
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,  // 4/27/26
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}\b/gi,
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    /\btomorrow\b/gi,
    /\btoday\b/gi,
  ]

  const otherTokensToRemove = [
    // Recurrence
    "every day", "daily", "each morning", "each night", "every week", "every month",
    "weekdays", "weekends",
    "every monday and wednesday",
    "every monday", "every tuesday", "every wednesday", "every thursday", "every friday", "every saturday", "every sunday",
    // Time patterns
    /at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?/gi,
    /\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*(?:to|until|-)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?/gi,
    /\d{1,2}:\d{2}\s*(?:am|pm)?/gi,
    /\b\d{1,2}(?:am|pm)\b/gi
  ]

  dateTokens.forEach(pattern => {
    title = title.replace(pattern, "")
  })

  otherTokensToRemove.forEach(token => {
    if (typeof token === 'string') {
      const regex = new RegExp("\\b" + token + "\\b", "gi")
      title = title.replace(regex, "")
    } else {
      title = title.replace(token, "")
    }
  })

  // 4. Clean up leftover prepositions and extra spaces
  // dangling "at", "on", "every", "from", "to", "until"
  const prepositions = ["at", "on", "every", "from", "to", "until", "for", "in"]
  prepositions.forEach(prep => {
    const regex = new RegExp("\\b" + prep + "\\b", "gi")
    title = title.replace(regex, "")
  })

  // Clean up extra whitespace
  title = title.replace(/\s+/g, " ").trim()

  // Remove leading prepositions specifically (often left over)
  title = title.replace(/^\s*(at|on|for|in)\s*/i, '')

  // 5. Capitalize the first letter
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1)
  }

  return {
    title: title || trimmedInput, // Fallback to trimmed input if title became empty
    entryType: classification.entryType,
    date: extracted.date,
    startTime: extracted.startTime,
    endTime: extracted.endTime,
    recurrence: extracted.recurrence,
    confidence: classification.confidence,
    needsConfirmation: classification.needsConfirmation,
    ambiguityReason: classification.ambiguityReason,
    rawInput: trimmedInput
  }
}

/**
 * Expected output for manual verification:
 * 
 * "dog walk every day at 7am"       → anchor
 *   Title: Dog walk
 *   Recurrence: daily
 *   Time: 07:00 AM
 * 
 * "dentist Thursday at 2pm"         → event
 *   Title: Dentist
 *   Date: [Next Thursday]
 *   Time: 02:00 PM
 * 
 * "dinner with Ana Friday 7pm"      → event
 *   Title: Dinner with Ana
 *   Date: [Next Friday]
 *   Time: 07:00 PM
 * 
 * "buy groceries"                   → task
 *   Title: Buy groceries
 * 
 * "buy groceries tomorrow"          → task with date
 *   Title: Buy groceries
 *   Date: [Tomorrow's date]
 * 
 * "team meeting every Monday at 10" → event
 *   Title: Team meeting
 *   Recurrence: weekly (Monday)
 *   Time: 10:00 AM
 * 
 * "sleep every day 10:30pm to 6:30am" → anchor
 *   Title: Sleep
 *   Recurrence: daily
 *   Time: 10:30 PM - 06:30 AM
 */
