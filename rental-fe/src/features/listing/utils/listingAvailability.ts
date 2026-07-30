import {
  DATE_ONLY_PATTERN,
  formatDateOnlyLabel,
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
  return (
    toListingAvailabilityDateKey(firstValue) ===
    toListingAvailabilityDateKey(secondValue)
  )
}

/**
 * Normalize API ISO timestamps or YYYY-MM-DD keys to a Bangkok date key.
 * Invalid / empty values become null (Flexible).
 */
export function toListingAvailabilityDateKey(
  availableAt: string | null | undefined,
): string | null {
  if (availableAt === null || availableAt === undefined) {
    return null
  }

  if (typeof availableAt !== "string") {
    return null
  }

  const trimmed = availableAt.trim()

  if (!trimmed) {
    return null
  }

  if (DATE_ONLY_PATTERN.test(trimmed)) {
    return trimmed
  }

  const parsed = new Date(trimmed)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  const dateKey = getCalendarDateKeyInTimeZone(parsed)

  return dateKey || null
}

export type ListingAvailabilityResolvedState =
  | {
      kind: "flexible"
      dateKey: null
      isAvailableNow: false
    }
  | {
      kind: "now"
      dateKey: string
      isAvailableNow: true
    }
  | {
      kind: "from_date"
      dateKey: string
      isAvailableNow: false
    }

/** Single pass used by badge presentation, labels, and equality checks. */
export function resolveListingAvailabilityState(
  availableAt: string | null | undefined,
  referenceDate = new Date(),
): ListingAvailabilityResolvedState {
  const dateKey = toListingAvailabilityDateKey(availableAt)

  if (dateKey === null) {
    return {
      kind: "flexible",
      dateKey: null,
      isAvailableNow: false,
    }
  }

  const todayKey = getTodayDateKeyInBangkok(referenceDate)

  if (todayKey && dateKey <= todayKey) {
    return {
      kind: "now",
      dateKey,
      isAvailableNow: true,
    }
  }

  return {
    kind: "from_date",
    dateKey,
    isAvailableNow: false,
  }
}

export type ListingAvailabilityBadgeTone = "active" | "secondary"

export type ListingAvailabilityBadgePresentation = {
  label: string
  tone: ListingAvailabilityBadgeTone
  isAvailableNow: boolean
}

export type ListingAvailabilityDisplay = ListingAvailabilityBadgePresentation & {
  kind: ListingAvailabilityResolvedState["kind"]
  /** Short date without year, e.g. "Aug 15". Null for flexible and available-now. */
  shortDateLabel: string | null
  /** Full date with year, e.g. "Aug 15, 2026". Null for flexible and available-now. */
  fullDateLabel: string | null
  /** Accessible label; future dates include the "Available from" prefix. */
  ariaLabel: string
}

/** Defensive input normalization for UI components. */
export function normalizeListingAvailableAt(
  availableAt: unknown,
): string | null {
  if (availableAt === null || availableAt === undefined) {
    return null
  }

  if (typeof availableAt !== "string") {
    return null
  }

  if (!availableAt.trim()) {
    return null
  }

  return availableAt
}

export function getListingAvailabilityDisplay(
  availableAt: unknown,
  referenceDate = new Date(),
): ListingAvailabilityDisplay {
  const safeAvailableAt = normalizeListingAvailableAt(availableAt)
  const state = resolveListingAvailabilityState(safeAvailableAt, referenceDate)
  const presentation = getListingAvailabilityBadgePresentationFromState(state)

  const shortDateLabel =
    state.kind === "from_date"
      ? formatDateOnlyLabel(state.dateKey, { year: undefined })
      : null
  const fullDateLabel =
    state.kind === "from_date"
      ? formatDateOnlyLabel(state.dateKey) ?? state.dateKey
      : null

  return {
    kind: state.kind,
    shortDateLabel,
    fullDateLabel,
    ariaLabel: getListingAvailabilityLabelFromState(state),
    ...presentation,
  }
}

export function isListingAvailableNow(
  availableAt: string | null,
  referenceDate = new Date(),
) {
  return resolveListingAvailabilityState(availableAt, referenceDate)
    .isAvailableNow
}

function getListingAvailabilityBadgePresentationFromState(
  state: ListingAvailabilityResolvedState,
): ListingAvailabilityBadgePresentation {
  if (state.kind === "flexible") {
    return {
      label: "Flexible",
      tone: "secondary",
      isAvailableNow: false,
    }
  }

  if (state.kind === "now") {
    return {
      label: "Available now",
      tone: "active",
      isAvailableNow: true,
    }
  }

  return {
    label: formatDateOnlyLabel(state.dateKey) ?? state.dateKey,
    tone: "secondary",
    isAvailableNow: false,
  }
}

function getListingAvailabilityLabelFromState(
  state: ListingAvailabilityResolvedState,
) {
  if (state.kind === "flexible") {
    return "Flexible"
  }

  if (state.kind === "now") {
    return "Available now"
  }

  const formattedDate = formatDateOnlyLabel(state.dateKey) ?? state.dateKey

  return `Available from ${formattedDate}`
}

export function getListingAvailabilityBadgePresentation(
  availableAt: string | null | undefined,
  referenceDate = new Date(),
): ListingAvailabilityBadgePresentation {
  const state = resolveListingAvailabilityState(
    normalizeListingAvailableAt(availableAt),
    referenceDate,
  )

  return getListingAvailabilityBadgePresentationFromState(state)
}

export function getListingAvailabilityLabel(
  availableAt: string | null | undefined,
  referenceDate = new Date(),
) {
  const state = resolveListingAvailabilityState(
    normalizeListingAvailableAt(availableAt),
    referenceDate,
  )

  return getListingAvailabilityLabelFromState(state)
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
