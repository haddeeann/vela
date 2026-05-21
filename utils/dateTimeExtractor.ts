import { ParsedRecurrence } from "../types/quickAdd.types"
import { formatDateString } from "./dateUtils"

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

  // Match formats: 4/27/26, 4/27/2026, 04/27/26
  const slashDatePattern = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/
  const slashMatch = normalizedInput.match(slashDatePattern)

  if (slashMatch) {
    let year = parseInt(slashMatch[3], 10)
    if (year < 100) year += 2000
    const month = parseInt(slashMatch[1], 10) - 1
    const day = parseInt(slashMatch[2], 10)
    result.date = formatDateString(new Date(year, month, day))
  } else if (normalizedInput.includes("tomorrow")) {
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    result.date = formatDateString(tomorrow)
  } else if (normalizedInput.includes("today")) {
    result.date = formatDateString(today)
  } else {
    // Check for "Apr 27", "April 27"
    const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
    const monthDayPattern = new RegExp(`\\b(${monthNames.join('|')})\\w*\\s+(\\d{1,2})\\b`, 'i')
    const monthDayMatch = normalizedInput.match(monthDayPattern)

    if (monthDayMatch) {
      const monthIndex = monthNames.indexOf(monthDayMatch[1].toLowerCase().substring(0, 3))
      const day = parseInt(monthDayMatch[2], 10)
      const year = today.getFullYear()
      const extractedDate = new Date(year, monthIndex, day)
      // If the date is in the past, assume next year
      if (extractedDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        extractedDate.setFullYear(year + 1)
      }
      result.date = formatDateString(extractedDate)
    } else {
      const daysMap: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
      }

      // Check for day names: "Monday", "Thursday" etc → resolve to the next upcoming occurrence
      for (const [dayName, dayIndex] of Object.entries(daysMap)) {
        if (new RegExp("\\b" + dayName + "\\b", "i").test(normalizedInput)) {
          const nextDate = new Date(today)
          let diff = dayIndex - today.getDay()
          if (diff <= 0) diff += 7
          nextDate.setDate(today.getDate() + diff)
          result.date = formatDateString(nextDate)
          break
        }
      }
    }
  }

  // --- Time Extraction ---
  const timeRangePattern =
    /(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*(?:to|-|until)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i
  const rangeMatch = normalizedInput.match(timeRangePattern)
  if (rangeMatch) {
    result.startTime = formatTime(rangeMatch[1])
    result.endTime = formatTime(rangeMatch[2])
  } else {
    // Single time extraction: "at 2pm", "at 2:30pm", "7am", "at 2"
    // Use a negative lookahead for range connectors to avoid matching just part of a range
    const singleTimeMatch = normalizedInput.match(/(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm))(?!\s*(?:to|until|-)\s*\d)/i)
    if (singleTimeMatch) {
      result.startTime = formatTime(singleTimeMatch[1])
    }
  }

  // --- Recurrence Extraction ---
  if (/\bevery\s+day\b|\bdaily\b/i.test(normalizedInput) ||
      normalizedInput.includes("each morning") || normalizedInput.includes("each night")) {
    result.recurrence = { frequency: "daily" }
  } else if (/\bevery\s+week\b|\bweekly\b/i.test(normalizedInput)) {
    result.recurrence = { frequency: "weekly" }
  } else if (/\bevery\s+month\b|\bmonthly\b/i.test(normalizedInput)) {
    result.recurrence = { frequency: "monthly" }
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

  }

  return result
}

function formatTime(raw: string): string {
  const cleaned = raw.trim().toUpperCase()
  const isPM = cleaned.includes("PM")
  const isAM = cleaned.includes("AM")
  const digits = cleaned.replace("AM", "").replace("PM", "").trim()
  const [h, m] = digits.split(":")
  const hour = parseInt(h, 10)
  const min = m ? m.padStart(2, "0") : "00"
  const period = isPM ? "PM" : isAM ? "AM" : "AM"
  return `${hour}:${min} ${period}`
}
