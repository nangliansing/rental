import { CalendarDays } from "lucide-react"
import type { ReactNode } from "react"

import {
  DateDayPicker,
  type DateDayPickerPreset,
  type DateDayPickerRelativeMonthJump,
  type DateDayPickerRenderTriggerProps,
} from "@/shared/components/inputs/DateDayPicker"
import {
  formatDateOnlyLabel,
  getTodayDateKeyInTimeZone,
  resolveReferenceDate,
} from "@/shared/dates/calendarDate"
import { CONTRACT_MONTH_OPTIONS } from "@/shared/options/rental-options"

import {
  dateKeyToListingAvailabilityFields,
  listingAvailabilityFieldsToDateKey,
  type ListingAvailabilityFormFields,
  type ListingAvailabilityMode,
} from "../utils/listingAvailability"

export type ListingAvailabilityFieldProps = {
  id?: string
  value: ListingAvailabilityFormFields
  onChange: (value: ListingAvailabilityFormFields) => void
  disabled?: boolean
  isLoading?: boolean
  readOnly?: boolean
  required?: boolean
  error?: ReactNode
  minDate?: string | null
  maxDate?: string | null
  disablePast?: boolean
  referenceDate?: Date
  triggerVariant?: "default" | "tab"
  renderTrigger?: (props: DateDayPickerRenderTriggerProps) => ReactNode
  className?: string
  "aria-label"?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean | "true" | "false"
}

const LISTING_CONTRACT_MONTH_JUMPS: DateDayPickerRelativeMonthJump[] =
  CONTRACT_MONTH_OPTIONS.filter(
    (option) =>
      typeof option.value === "number" &&
      Number.isInteger(option.value) &&
      option.value >= 1,
  ).map((option) => ({
    id: `in-${option.value}-months`,
    label: option.label,
    months: option.value,
  }))

function isListingAvailabilityMode(
  value: unknown,
): value is ListingAvailabilityMode {
  return value === "flexible" || value === "now" || value === "from_date"
}

function normalizeListingAvailabilityValue(
  value: ListingAvailabilityFormFields | null | undefined,
): ListingAvailabilityFormFields {
  return {
    availabilityMode: isListingAvailabilityMode(value?.availabilityMode)
      ? value.availabilityMode
      : "flexible",
    availableFromDate:
      typeof value?.availableFromDate === "string"
        ? value.availableFromDate
        : "",
  }
}

function buildListingAvailabilityPresets(
  referenceDate: Date,
): DateDayPickerPreset[] {
  const todayKey = getTodayDateKeyInTimeZone(referenceDate)

  return [
    { id: "flexible", label: "Flexible", value: null },
    ...(todayKey
      ? [{ id: "now", label: "Available now", value: todayKey }]
      : []),
  ]
}

export function ListingAvailabilityField({
  id,
  value,
  onChange,
  disabled = false,
  isLoading = false,
  readOnly = false,
  required = false,
  error,
  minDate = null,
  maxDate = null,
  disablePast = true,
  referenceDate,
  triggerVariant = "default",
  renderTrigger,
  className,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: ListingAvailabilityFieldProps) {
  const resolvedReferenceDate = resolveReferenceDate(referenceDate)
  const safeValue = normalizeListingAvailabilityValue(value)
  const useTabTrigger = triggerVariant === "tab"

  return (
    <DateDayPicker
      id={id}
      value={listingAvailabilityFieldsToDateKey(
        safeValue,
        resolvedReferenceDate,
      )}
      onChange={(nextValue) =>
        onChange(
          dateKeyToListingAvailabilityFields(nextValue, resolvedReferenceDate),
        )
      }
      presets={buildListingAvailabilityPresets(resolvedReferenceDate)}
      relativeMonthJumps={LISTING_CONTRACT_MONTH_JUMPS}
      relativeMonthJumpsLabel="Jump by contract length"
      emptyLabel="Flexible"
      formatValueLabel={(dateKey) => {
        const label = formatDateOnlyLabel(dateKey)
        if (!label) {
          return "Flexible"
        }

        return useTabTrigger ? `From ${label}` : `Available from ${label}`
      }}
      disabled={disabled}
      isLoading={isLoading}
      readOnly={readOnly}
      required={required}
      error={error}
      minDate={minDate}
      maxDate={maxDate}
      disablePast={disablePast}
      modalTitle="When is the room available?"
      referenceDate={resolvedReferenceDate}
      triggerVariant={triggerVariant}
      triggerIcon={useTabTrigger ? CalendarDays : undefined}
      renderTrigger={renderTrigger}
      className={className}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
    />
  )
}
