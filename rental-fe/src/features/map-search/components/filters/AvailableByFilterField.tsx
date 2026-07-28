import type { ReactNode } from "react"

import {
  DateDayPicker,
  type DateDayPickerPreset,
} from "@/shared/components/inputs/DateDayPicker"
import {
  formatDateOnlyLabel,
  getTodayDateKeyInTimeZone,
  normalizeDateOnlyKey,
  resolveReferenceDate,
} from "@/shared/dates/calendarDate"

export type AvailableByFilterFieldProps = {
  id?: string
  value?: string | null
  onChange: (value: string | undefined) => void
  disabled?: boolean
  isLoading?: boolean
  readOnly?: boolean
  error?: ReactNode
  minDate?: string | null
  maxDate?: string | null
  disablePast?: boolean
  referenceDate?: Date
  className?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean | "true" | "false"
}

function buildAvailableByPresets(referenceDate: Date): DateDayPickerPreset[] {
  const todayKey = getTodayDateKeyInTimeZone(referenceDate)

  return [
    { id: "flexible", label: "Flexible", value: null },
    ...(todayKey
      ? [{ id: "today", label: "Today", value: todayKey }]
      : []),
  ]
}

export function AvailableByFilterField({
  id,
  value = null,
  onChange,
  disabled = false,
  isLoading = false,
  readOnly = false,
  error,
  minDate = null,
  maxDate = null,
  disablePast = true,
  referenceDate,
  className,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: AvailableByFilterFieldProps) {
  const resolvedReferenceDate = resolveReferenceDate(referenceDate)

  return (
    <DateDayPicker
      id={id}
      value={normalizeDateOnlyKey(value)}
      onChange={(nextValue) => onChange(nextValue ?? undefined)}
      presets={buildAvailableByPresets(resolvedReferenceDate)}
      emptyLabel="Flexible"
      formatValueLabel={(dateKey) => {
        const label = formatDateOnlyLabel(dateKey)
        return label ? `By ${label}` : "Flexible"
      }}
      disabled={disabled}
      isLoading={isLoading}
      readOnly={readOnly}
      error={error}
      minDate={minDate}
      maxDate={maxDate}
      disablePast={disablePast}
      modalTitle="Need a room by"
      referenceDate={resolvedReferenceDate}
      className={className}
      aria-describedby={ariaDescribedBy}
      aria-invalid={ariaInvalid}
    />
  )
}
