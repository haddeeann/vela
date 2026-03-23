import { ParsedRecurrence } from "../types/quickAdd.types"

/**
 * Extracts date, time, and recurrence from a string input.
 * Pure utility module with no React or UI imports.
 */
export function extractDateTime(input: string): {
  date?: string
  startTime?: string
  endTime?: string
  recurrence?: ParsedRecurrence
} {
  const result: {
    date?: string
    startTime?: string
    endTime?: string
    recurrence?: ParsedRecurrence
  } = {}

  const normalizedInput = input.toLowerCase()

  // --- Date Extraction ---
  const today = new Date()

  if (normalizedInput.includes("today")) {
    result.date = formatDate(today)
  } else if (normalizedInput.includes("tomorrow")) {
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    result.date = formatDate(tomorrow)
  } else {
    const daysMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
    }

    // Check for day names: "Monday", "Thursday" etc → resolve to the next upcoming occurrence
    // Do not return past dates when resolving day names
    for (const [dayName, dayIndex] of Object.entries(daysMap)) {
      if (new RegExp("\\b" + dayName + "\\b", "i").test(normalizedInput)) {
        const nextDate = new Date(today)
        let diff = dayIndex - today.getDay()
        if (diff <= 0) diff += 7
        nextDate.setDate(today.getDate() + diff)
        result.date = formatDate(nextDate)
        break
      }
    }
  }

  // --- Time Extraction ---
  // Handle time ranges first: "10:30pm to 6:30am"
  const rangeMatch = normalizedInput.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:to|until|-)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i)
  if (rangeMatch) {
    result.startTime = parseTimeString(rangeMatch[1])
    result.endTime = parseTimeString(rangeMatch[2])
  } else {
    // Single time extraction: "at 2pm", "at 2:30pm", "7am", "at 2"
    // Use a negative lookahead for range connectors to avoid matching just part of a range
    const singleTimeMatch = normalizedInput.match(/(?:at\s+)?(\d{1,2}(?::\d{2})?(?:\s*(?:am|pm))?)(?!\s*(?:to|until|-)\s*\d)/i)
    if (singleTimeMatch) {
      result.startTime = parseTimeString(singleTimeMatch[1])
    }
  }

  // --- Recurrence Extraction ---
  if (normalizedInput.includes("every day") || normalizedInput.includes("daily") ||
      normalizedInput.includes("each morning") || normalizedInput.includes("each night")) {
    result.recurrence = { frequency: "daily" }
  } else if (normalizedInput.includes("weekdays")) {
    result.recurrence = { frequency: "weekly", daysOfWeek: [1, 2, 3, 4, 5] }
  } else if (normalizedInput.includes("weekends")) {
    result.recurrence = { frequency: "weekly", daysOfWeek: [0, 6] }
  } else if (normalizedInput.includes("every monday and wednesday")) {
    result.recurrence = { frequency: "weekly", daysOfWeek: [1, 3] }
  } else {
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    for (let i = 0; i < dayNames.length; i++) {
      if (normalizedInput.includes("every " + dayNames[i])) {
        result.recurrence = { frequency: "weekly", daysOfWeek: [i] }
        break
      }
    }

    if (!result.recurrence) {
      if (normalizedInput.includes("every week")) {
        result.recurrence = { frequency: "weekly" }
      } else if (normalizedInput.includes("every month")) {
        result.recurrence = { frequency: "monthly" }
      }
    }
  }

  return result
}

function formatDate(date: Date): string {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function parseTimeString(timeStr: string): string | undefined {
  const match = timeStr.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!match) return undefined

  let hour = parseInt(match[1], 10)
  const minute = match[2] || "00"
  const ampm = match[3] ? match[3].toLowerCase() : undefined

  if (ampm) {
    if (ampm === "pm" && hour < 12) hour += 12
    if (ampm === "am" && hour === 12) hour = 0
  } else {
    // "at 2" with no AM/PM → assume PM if hour <= 6, else AM
    if (hour <= 6) hour += 12
  }

  const finalHour = hour % 24
  const displayHour = finalHour === 0 ? 12 : (finalHour > 12 ? finalHour - 12 : finalHour)
  const displayPeriod = finalHour >= 12 ? "PM" : "AM"

  return `${String(displayHour).padStart(2, "0")}:${minute} ${displayPeriod}`
}
