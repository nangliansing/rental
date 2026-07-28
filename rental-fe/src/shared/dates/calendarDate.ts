/** Thailand-wide civil calendar (UTC+7). Not Bangkok-city-only. */
export const THAILAND_TIME_ZONE = "Asia/Bangkok"

export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export type CalendarMonth = {
  year: number
  monthIndex: number
}

export type CalendarDateParts = {
  year: number
  month: number
  day: number
}

export function isValidDateOnlyKey(value: unknown): value is string {
  if (typeof value !== "string") {
    return false
  }

  const trimmed = value.trim()

  if (!DATE_ONLY_PATTERN.test(trimmed)) {
    return false
  }

  return parseDateOnlyParts(trimmed) !== null
}

export function normalizeDateOnlyKey(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()

  if (!isValidDateOnlyKey(trimmed)) {
    return null
  }

  return trimmed
}

export function parseDateOnlyParts(value: string): CalendarDateParts | null {
  if (!DATE_ONLY_PATTERN.test(value)) {
    return null
  }

  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1
  ) {
    return null
  }

  const daysInMonth = getDaysInMonth(year, month - 1)

  if (day > daysInMonth) {
    return null
  }

  return { year, month, day }
}

export function buildDateOnlyKey(year: number, month: number, day: number) {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1
  ) {
    return null
  }

  const daysInMonth = getDaysInMonth(year, month - 1)

  if (day > daysInMonth) {
    return null
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function getCalendarDateKeyInTimeZone(
  date: Date,
  timeZone = THAILAND_TIME_ZONE,
) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

export function getTodayDateKeyInTimeZone(
  referenceDate = new Date(),
  timeZone = THAILAND_TIME_ZONE,
) {
  return getCalendarDateKeyInTimeZone(referenceDate, timeZone)
}

export function resolveReferenceDate(referenceDate?: Date) {
  if (referenceDate instanceof Date && !Number.isNaN(referenceDate.getTime())) {
    return referenceDate
  }

  return new Date()
}

export function formatDateOnlyLabel(
  value: string,
  options?: Intl.DateTimeFormatOptions,
) {
  const parts = parseDateOnlyParts(value.trim())

  if (!parts) {
    return null
  }

  const utcNoon = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12))

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  }).format(utcNoon)
}

export function compareDateOnlyKeys(left: string, right: string) {
  if (left === right) {
    return 0
  }

  return left < right ? -1 : 1
}

export function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

export function shiftCalendarMonth(
  month: CalendarMonth,
  deltaMonths: number,
): CalendarMonth {
  const safeDelta =
    typeof deltaMonths === "number" && Number.isFinite(deltaMonths)
      ? Math.trunc(deltaMonths)
      : 0
  const absoluteIndex = month.year * 12 + month.monthIndex + safeDelta
  const year = Math.floor(absoluteIndex / 12)
  const monthIndex = ((absoluteIndex % 12) + 12) % 12

  return { year, monthIndex }
}

export function getCalendarMonthFromDateOnlyKey(
  value: string | null | undefined,
  fallback = new Date(),
): CalendarMonth {
  const normalized = normalizeDateOnlyKey(value)

  if (normalized) {
    const parts = parseDateOnlyParts(normalized)

    if (parts) {
      return { year: parts.year, monthIndex: parts.month - 1 }
    }
  }

  const todayKey = getTodayDateKeyInTimeZone(fallback)

  if (!todayKey) {
    return { year: fallback.getFullYear(), monthIndex: fallback.getMonth() }
  }

  const todayParts = parseDateOnlyParts(todayKey)

  if (!todayParts) {
    return { year: fallback.getFullYear(), monthIndex: fallback.getMonth() }
  }

  return { year: todayParts.year, monthIndex: todayParts.month - 1 }
}

/**
 * Builds a Sunday-start month grid. Each cell is a day number or null padding.
 */
export function buildMonthDayGrid(year: number, monthIndex: number) {
  const daysInMonth = getDaysInMonth(year, monthIndex)
  const firstWeekday = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay()
  const cells: Array<number | null> = []

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push(null)
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day)
  }

  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  const weeks: Array<Array<number | null>> = []

  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7))
  }

  return weeks
}

export function formatCalendarMonthLabel(month: CalendarMonth) {
  const utcNoon = new Date(Date.UTC(month.year, month.monthIndex, 1, 12))

  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(utcNoon)
}

/**
 * Adds whole calendar months to a YYYY-MM-DD key, clamping the day to the
 * last valid day of the target month (e.g. Jan 31 + 1 month => Feb 28/29).
 */
export function addCalendarMonthsToDateOnlyKey(
  dateKey: string,
  months: number,
) {
  const parts = parseDateOnlyParts(dateKey.trim())

  if (!parts) {
    return null
  }

  if (typeof months !== "number" || !Number.isFinite(months) || !Number.isInteger(months)) {
    return null
  }

  const delta = months
  const shifted = shiftCalendarMonth(
    { year: parts.year, monthIndex: parts.month - 1 },
    delta,
  )
  const daysInTargetMonth = getDaysInMonth(shifted.year, shifted.monthIndex)
  const day = Math.min(parts.day, daysInTargetMonth)

  return buildDateOnlyKey(shifted.year, shifted.monthIndex + 1, day)
}

export function resolveDateOnlyRangeBounds({
  minDate,
  maxDate,
  disablePast = false,
  todayKey,
}: {
  minDate?: string | null
  maxDate?: string | null
  disablePast?: boolean
  todayKey?: string | null
}): { minDate: string | null; maxDate: string | null } {
  const normalizedMin = normalizeDateOnlyKey(minDate)
  const normalizedMax = normalizeDateOnlyKey(maxDate)
  const normalizedToday = normalizeDateOnlyKey(todayKey)

  let effectiveMin = normalizedMin

  if (disablePast && normalizedToday) {
    effectiveMin =
      effectiveMin === null || effectiveMin < normalizedToday
        ? normalizedToday
        : effectiveMin
  }

  if (
    effectiveMin !== null &&
    normalizedMax !== null &&
    effectiveMin > normalizedMax
  ) {
    // Invalid range — treat as empty selectable window (everything blocked except null presets).
    return { minDate: effectiveMin, maxDate: normalizedMax }
  }

  return { minDate: effectiveMin, maxDate: normalizedMax }
}

export function isDateOnlyKeyInRange(
  dateKey: string,
  bounds: { minDate?: string | null; maxDate?: string | null },
) {
  const normalized = normalizeDateOnlyKey(dateKey)

  if (!normalized) {
    return false
  }

  const minDate = normalizeDateOnlyKey(bounds.minDate)
  const maxDate = normalizeDateOnlyKey(bounds.maxDate)

  if (minDate !== null && normalized < minDate) {
    return false
  }

  if (maxDate !== null && normalized > maxDate) {
    return false
  }

  return true
}
