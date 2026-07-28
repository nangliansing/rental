import {
  DATE_ONLY_PATTERN,
  getCalendarDateKeyInTimeZone as getSharedCalendarDateKeyInTimeZone,
  getTodayDateKeyInTimeZone,
  THAILAND_TIME_ZONE,
} from "@/shared/dates/calendarDate"

export const LISTING_AVAILABILITY_TIME_ZONE = THAILAND_TIME_ZONE

export type ListingAvailabilityMode = "flexible" | "now" | "from_date"

export type ListingAvailabilityFormFields = {
  availabilityMode: ListingAvailabilityMode
  availableFromDate: string
}

export type ListingAvailabilityPatchInput = Partial<ListingAvailabilityFormFields> & {
  availableAt?: string | null
}

const LISTING_AVAILABILITY_FORM_FIELD_NAMES = [
  "availabilityMode",
  "availableFromDate",
] as const satisfies ReadonlyArray<keyof ListingAvailabilityFormFields>

export function getCalendarDateKeyInTimeZone(
  date: Date,
  timeZone = LISTING_AVAILABILITY_TIME_ZONE,
) {
  return getSharedCalendarDateKeyInTimeZone(date, timeZone) ?? ""
}

export function getTodayDateKeyInBangkok(referenceDate = new Date()) {
  return (
    getTodayDateKeyInTimeZone(referenceDate, LISTING_AVAILABILITY_TIME_ZONE) ??
    ""
  )
}

export function listingAvailabilityFieldsToDateKey(
  fields: ListingAvailabilityFormFields,
  referenceDate = new Date(),
): string | null {
  if (fields.availabilityMode === "flexible") {
    return null
  }

  if (fields.availabilityMode === "now") {
    return getTodayDateKeyInBangkok(referenceDate) || null
  }

  const trimmedDate = fields.availableFromDate.trim()

  return DATE_ONLY_PATTERN.test(trimmedDate) ? trimmedDate : null
}

export function dateKeyToListingAvailabilityFields(
  value: string | null,
  referenceDate = new Date(),
): ListingAvailabilityFormFields {
  if (value === null) {
    return {
      availabilityMode: "flexible",
      availableFromDate: "",
    }
  }

  const todayKey = getTodayDateKeyInBangkok(referenceDate)

  if (!DATE_ONLY_PATTERN.test(value)) {
    return {
      availabilityMode: "flexible",
      availableFromDate: "",
    }
  }

  if (todayKey && value <= todayKey) {
    return {
      availabilityMode: "now",
      availableFromDate: "",
    }
  }

  return {
    availabilityMode: "from_date",
    availableFromDate: value,
  }
}

export function parseAvailableAtFromApi(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value !== "string") {
    return null
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString()
}

export function parseListingAvailabilityFromApi(
  value: unknown,
  referenceDate = new Date(),
): ListingAvailabilityFormFields {
  return parseAvailableAtToFormFields(
    parseAvailableAtFromApi(value),
    referenceDate,
  )
}

export function serializeListingAvailabilityForApi(
  fields: ListingAvailabilityFormFields,
  referenceDate = new Date(),
): string | null {
  return serializeAvailableAtForRequest(
    fields.availabilityMode,
    fields.availableFromDate,
    referenceDate,
  )
}

export function normalizeListingAvailabilityPatchInput<
  T extends Record<string, unknown>,
>(input: T): Omit<T, keyof ListingAvailabilityFormFields> & {
  availableAt?: string | null
} {
  const record = { ...input } as T &
    ListingAvailabilityPatchInput &
    Record<string, unknown>

  const hasFormFields = LISTING_AVAILABILITY_FORM_FIELD_NAMES.some((fieldName) =>
    Object.hasOwn(record, fieldName),
  )

  for (const fieldName of LISTING_AVAILABILITY_FORM_FIELD_NAMES) {
    delete record[fieldName]
  }

  if (hasFormFields) {
    record.availableAt = serializeListingAvailabilityForApi({
      availabilityMode:
        (input.availabilityMode as ListingAvailabilityMode | undefined) ??
        "flexible",
      availableFromDate:
        typeof input.availableFromDate === "string" ? input.availableFromDate : "",
    })
  }

  return record
}

export function parseAvailableAtToFormFields(
  availableAt: string | null,
  referenceDate = new Date(),
): ListingAvailabilityFormFields {
  if (availableAt === null) {
    return {
      availabilityMode: "flexible",
      availableFromDate: "",
    }
  }

  const availableDateKey = getCalendarDateKeyInTimeZone(new Date(availableAt))
  const todayKey = getTodayDateKeyInBangkok(referenceDate)

  if (availableDateKey <= todayKey) {
    return {
      availabilityMode: "now",
      availableFromDate: "",
    }
  }

  return {
    availabilityMode: "from_date",
    availableFromDate: availableDateKey,
  }
}

export function serializeAvailableAtForRequest(
  mode: ListingAvailabilityMode,
  availableFromDate: string,
  referenceDate = new Date(),
): string | null {
  if (mode === "flexible") {
    return null
  }

  if (mode === "now") {
    return getTodayDateKeyInBangkok(referenceDate)
  }

  const trimmedDate = availableFromDate.trim()

  if (!DATE_ONLY_PATTERN.test(trimmedDate)) {
    return null
  }

  return trimmedDate
}

export function areAvailableAtValuesEqual(
  firstValue: string | null,
  secondValue: string | null,
) {
  if (firstValue === null && secondValue === null) {
    return true
  }

  if (firstValue === null || secondValue === null) {
    return false
  }

  return (
    getCalendarDateKeyInTimeZone(new Date(firstValue)) ===
    getCalendarDateKeyInTimeZone(new Date(secondValue))
  )
}

export function getListingAvailabilityLabel(
  availableAt: string | null,
  referenceDate = new Date(),
) {
  if (availableAt === null) {
    return "Flexible"
  }

  const availableDateKey = getCalendarDateKeyInTimeZone(new Date(availableAt))
  const todayKey = getTodayDateKeyInBangkok(referenceDate)

  if (availableDateKey <= todayKey) {
    return "Available now"
  }

  const formattedDate = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: LISTING_AVAILABILITY_TIME_ZONE,
  }).format(new Date(availableAt))

  return `Available from ${formattedDate}`
}

export function isListingAvailabilityFormValid(
  mode: ListingAvailabilityMode,
  availableFromDate: string,
) {
  if (mode !== "from_date") {
    return true
  }

  return DATE_ONLY_PATTERN.test(availableFromDate.trim())
}
