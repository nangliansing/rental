import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getEdgeToEdgeHorizontalScrollRowClass } from "@/shared/components/layout/horizontalScrollRow"
import {
  addCalendarMonthsToDateOnlyKey,
  buildDateOnlyKey,
  buildMonthDayGrid,
  formatCalendarMonthLabel,
  formatDateOnlyLabel,
  getCalendarMonthFromDateOnlyKey,
  getTodayDateKeyInTimeZone,
  isDateOnlyKeyInRange,
  normalizeDateOnlyKey,
  resolveDateOnlyRangeBounds,
  resolveReferenceDate,
  shiftCalendarMonth,
  type CalendarMonth,
} from "@/shared/dates/calendarDate"

export type DateDayPickerPreset = {
  id: string
  label: string
  value: string | null
}

export type DateDayPickerRelativeMonthJump = {
  id: string
  label: string
  months: number
}

export type DateDayCalendarProps = {
  value?: string | null
  onSelect: (
    value: string | null,
    options?: { keepOpen?: boolean },
  ) => void
  presets?: readonly DateDayPickerPreset[]
  relativeMonthJumps?: readonly DateDayPickerRelativeMonthJump[]
  relativeMonthJumpsLabel?: string
  minDate?: string | null
  maxDate?: string | null
  disablePast?: boolean
  referenceDate?: Date
  className?: string
}

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const

const DEFAULT_JUMPS_LABEL = "Jump by contract length"

const CHIP_BUTTON_CLASS =
  "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

function DateDayChip({
  label,
  isSelected,
  disabled = false,
  onClick,
}: {
  label: string
  isSelected: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      disabled={disabled}
      className={cn(
        CHIP_BUTTON_CLASS,
        isSelected
          ? "bg-slate-950 text-white"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200",
      )}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

export function normalizeDateDayPresets(
  presets: readonly DateDayPickerPreset[] | undefined,
) {
  if (!Array.isArray(presets)) {
    return [] as DateDayPickerPreset[]
  }

  const seenIds = new Set<string>()
  const normalized: DateDayPickerPreset[] = []

  for (const preset of presets) {
    if (!preset || typeof preset !== "object") {
      continue
    }

    const id = typeof preset.id === "string" ? preset.id.trim() : ""
    const label = typeof preset.label === "string" ? preset.label.trim() : ""

    if (!id || !label || seenIds.has(id)) {
      continue
    }

    const value =
      preset.value === null || preset.value === undefined
        ? null
        : normalizeDateOnlyKey(preset.value)

    if (preset.value !== null && preset.value !== undefined && value === null) {
      continue
    }

    seenIds.add(id)
    normalized.push({ id, label, value })
  }

  return normalized
}

function normalizeRelativeMonthJumps(
  jumps: readonly DateDayPickerRelativeMonthJump[] | undefined,
) {
  if (!Array.isArray(jumps)) {
    return [] as DateDayPickerRelativeMonthJump[]
  }

  const seenIds = new Set<string>()
  const normalized: DateDayPickerRelativeMonthJump[] = []

  for (const jump of jumps) {
    if (!jump || typeof jump !== "object") {
      continue
    }

    const id = typeof jump.id === "string" ? jump.id.trim() : ""
    const label = typeof jump.label === "string" ? jump.label.trim() : ""
    const months = jump.months

    if (
      !id ||
      !label ||
      seenIds.has(id) ||
      typeof months !== "number" ||
      !Number.isInteger(months) ||
      months < 1
    ) {
      continue
    }

    seenIds.add(id)
    normalized.push({ id, label, months })
  }

  return normalized
}

function isSelectableDateValue(
  value: string | null,
  bounds: { minDate: string | null; maxDate: string | null },
) {
  return value === null || isDateOnlyKeyInRange(value, bounds)
}

/**
 * Standalone day-calendar UI (chips + month grid). Used inside DateDayPicker’s
 * modal, and reusable anywhere a calendar panel is needed without a trigger.
 */
export function DateDayCalendar({
  value = null,
  onSelect,
  presets,
  relativeMonthJumps,
  relativeMonthJumpsLabel = DEFAULT_JUMPS_LABEL,
  minDate = null,
  maxDate = null,
  disablePast = false,
  referenceDate,
  className,
}: DateDayCalendarProps) {
  const resolvedReferenceDate = resolveReferenceDate(referenceDate)
  const normalizedValue = normalizeDateOnlyKey(value)
  const normalizedPresets = useMemo(
    () => normalizeDateDayPresets(presets),
    [presets],
  )
  const normalizedMonthJumps = useMemo(
    () => normalizeRelativeMonthJumps(relativeMonthJumps),
    [relativeMonthJumps],
  )
  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>(() =>
    getCalendarMonthFromDateOnlyKey(normalizedValue, resolvedReferenceDate),
  )

  const todayKey = getTodayDateKeyInTimeZone(resolvedReferenceDate)
  const rangeBounds = useMemo(
    () =>
      resolveDateOnlyRangeBounds({
        minDate,
        maxDate,
        disablePast,
        todayKey,
      }),
    [disablePast, maxDate, minDate, todayKey],
  )
  const monthWeeks = useMemo(
    () => buildMonthDayGrid(visibleMonth.year, visibleMonth.monthIndex),
    [visibleMonth.monthIndex, visibleMonth.year],
  )
  const jumpsHeading =
    typeof relativeMonthJumpsLabel === "string" &&
    relativeMonthJumpsLabel.trim()
      ? relativeMonthJumpsLabel.trim()
      : DEFAULT_JUMPS_LABEL
  const showPresetGroup = normalizedPresets.length > 0
  const showJumpGroup = normalizedMonthJumps.length > 0 && Boolean(todayKey)
  const showChipRow = showPresetGroup || showJumpGroup

  const selectValue = (
    nextValue: string | null,
    options?: { keepOpen?: boolean },
  ) => {
    const normalizedNext =
      nextValue === null ? null : normalizeDateOnlyKey(nextValue)

    if (!isSelectableDateValue(normalizedNext, rangeBounds)) {
      return
    }

    onSelect(normalizedNext, options)
  }

  const jumpByRelativeMonths = (months: number) => {
    if (!todayKey) {
      return
    }

    const targetKey = addCalendarMonthsToDateOnlyKey(todayKey, months)

    if (!targetKey || !isSelectableDateValue(targetKey, rangeBounds)) {
      return
    }

    setVisibleMonth(
      getCalendarMonthFromDateOnlyKey(targetKey, resolvedReferenceDate),
    )
    selectValue(targetKey, { keepOpen: true })
  }

  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5",
        className,
      )}
    >
      {showChipRow && (
        <div
          className={getEdgeToEdgeHorizontalScrollRowClass(
            "-mx-4 md:-mx-5",
            "px-4 md:px-5",
            "mb-5 items-center gap-2",
          )}
        >
          {showPresetGroup && (
            <div
              className="flex shrink-0 items-center gap-2"
              role="group"
              aria-label="Availability presets"
            >
              {normalizedPresets.map((preset) => (
                <DateDayChip
                  key={preset.id}
                  label={preset.label}
                  isSelected={preset.value === normalizedValue}
                  disabled={!isSelectableDateValue(preset.value, rangeBounds)}
                  onClick={() => selectValue(preset.value)}
                />
              ))}
            </div>
          )}

          {showPresetGroup && showJumpGroup && (
            <div
              role="separator"
              aria-orientation="vertical"
              className="mx-0.5 h-6 w-px shrink-0 bg-slate-200"
            />
          )}

          {showJumpGroup && todayKey && (
            <div
              className="flex shrink-0 items-center gap-2"
              role="group"
              aria-label={jumpsHeading}
            >
              {normalizedMonthJumps.map((jump) => {
                const targetKey = addCalendarMonthsToDateOnlyKey(
                  todayKey,
                  jump.months,
                )
                const isJumpDisabled =
                  !targetKey || !isSelectableDateValue(targetKey, rangeBounds)

                return (
                  <DateDayChip
                    key={jump.id}
                    label={jump.label}
                    isSelected={Boolean(
                      targetKey && targetKey === normalizedValue,
                    )}
                    disabled={isJumpDisabled}
                    onClick={() => jumpByRelativeMonths(jump.months)}
                  />
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Previous month"
            onClick={() =>
              setVisibleMonth((current) => shiftCalendarMonth(current, -1))
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <p className="text-sm font-semibold text-slate-950">
            {formatCalendarMonthLabel(visibleMonth)}
          </p>

          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Next month"
            onClick={() =>
              setVisibleMonth((current) => shiftCalendarMonth(current, 1))
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {monthWeeks.flatMap((week, weekIndex) =>
            week.map((day, dayIndex) => {
              if (day === null) {
                return (
                  <div key={`pad-${weekIndex}-${dayIndex}`} className="h-10" />
                )
              }

              const dateKey = buildDateOnlyKey(
                visibleMonth.year,
                visibleMonth.monthIndex + 1,
                day,
              )

              if (!dateKey) {
                return (
                  <div
                    key={`invalid-${weekIndex}-${dayIndex}`}
                    className="h-10"
                  />
                )
              }

              const isSelected = dateKey === normalizedValue
              const isToday = dateKey === todayKey
              const isDayDisabled = !isDateOnlyKeyInRange(dateKey, rangeBounds)

              return (
                <button
                  key={dateKey}
                  type="button"
                  aria-label={formatDateOnlyLabel(dateKey) ?? dateKey}
                  aria-pressed={isSelected}
                  disabled={isDayDisabled}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-xl text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent",
                    isSelected
                      ? "bg-slate-950 text-white disabled:opacity-100"
                      : isToday
                        ? "bg-slate-100 text-slate-950 hover:bg-slate-200"
                        : "text-slate-800 hover:bg-slate-100",
                  )}
                  onClick={() => selectValue(dateKey)}
                >
                  {day}
                </button>
              )
            }),
          )}
        </div>
      </div>
    </div>
  )
}
