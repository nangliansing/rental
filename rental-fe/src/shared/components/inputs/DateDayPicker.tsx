import { useId, useMemo, useState, type ReactNode } from "react"
import { type LucideIcon } from "lucide-react"

import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"

import { cn } from "@/lib/utils"
import { FormTabTrigger } from "@/shared/components/inputs/FormTabTrigger"
import { ModalDismissHeader } from "@/shared/components/navigation/ModalDismissHeader"
import { ResponsiveScreenModal } from "@/shared/components/modals/ResponsiveScreenModal"
import {
  formatDateOnlyLabel,
  normalizeDateOnlyKey,
  resolveReferenceDate,
} from "@/shared/dates/calendarDate"
import { hasReactNodeContent } from "@/shared/utils/reactNode"

import {
  DateDayCalendar,
  normalizeDateDayPresets,
  type DateDayPickerPreset,
  type DateDayPickerRelativeMonthJump,
} from "./DateDayCalendar"

export type {
  DateDayPickerPreset,
  DateDayPickerRelativeMonthJump,
} from "./DateDayCalendar"

export type DateDayPickerTriggerVariant = "default" | "tab"

export type DateDayPickerRenderTriggerProps = {
  id: string
  isOpen: boolean
  disabled: boolean
  isLoading: boolean
  readOnly: boolean
  required: boolean
  triggerLabel: string
  error?: ReactNode
  "aria-label"?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean
  openPicker: () => void
}

export type DateDayPickerProps = {
  id?: string
  value?: string | null
  onChange: (value: string | null) => void
  presets?: readonly DateDayPickerPreset[]
  relativeMonthJumps?: readonly DateDayPickerRelativeMonthJump[]
  relativeMonthJumpsLabel?: string
  emptyLabel?: string
  formatValueLabel?: (value: string) => string
  disabled?: boolean
  isLoading?: boolean
  readOnly?: boolean
  required?: boolean
  error?: ReactNode
  minDate?: string | null
  maxDate?: string | null
  disablePast?: boolean
  modalTitle?: string
  referenceDate?: Date
  triggerVariant?: DateDayPickerTriggerVariant
  triggerIcon?: LucideIcon
  renderTrigger?: (props: DateDayPickerRenderTriggerProps) => ReactNode
  className?: string
  triggerClassName?: string
  "aria-label"?: string
  "aria-describedby"?: string
  "aria-invalid"?: boolean | "true" | "false"
}


function resolveTriggerLabel({
  value,
  presets,
  emptyLabel,
  formatValueLabel,
}: {
  value: string | null
  presets: readonly DateDayPickerPreset[]
  emptyLabel: string
  formatValueLabel?: (value: string) => string
}) {
  const matchingPreset = presets.find((preset) => preset.value === value)

  if (matchingPreset) {
    return matchingPreset.label
  }

  if (value === null) {
    return emptyLabel
  }

  if (formatValueLabel) {
    const customLabel = formatValueLabel(value)
    const trimmed = typeof customLabel === "string" ? customLabel.trim() : ""

    if (trimmed) {
      return trimmed
    }
  }

  return formatDateOnlyLabel(value) ?? emptyLabel
}

export function DateDayPicker({
  id,
  value = null,
  onChange,
  presets,
  relativeMonthJumps,
  relativeMonthJumpsLabel,
  emptyLabel = "Select date",
  formatValueLabel,
  disabled = false,
  isLoading = false,
  readOnly = false,
  required = false,
  error,
  minDate = null,
  maxDate = null,
  disablePast = false,
  modalTitle = "Select date",
  referenceDate,
  triggerVariant = "default",
  triggerIcon,
  renderTrigger,
  className,
  triggerClassName,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}: DateDayPickerProps) {
  const generatedId = useId()
  const triggerId = id?.trim() || generatedId
  const errorId = `${triggerId}-error`
  const showError = hasReactNodeContent(error)
  const isAriaInvalid =
    showError || ariaInvalid === true || ariaInvalid === "true"
  const isInteractionLocked = disabled || isLoading || readOnly
  const normalizedValue = normalizeDateOnlyKey(value)
  const resolvedReferenceDate = resolveReferenceDate(referenceDate)
  const normalizedPresets = useMemo(
    () => normalizeDateDayPresets(presets),
    [presets],
  )
  const [isOpen, setIsOpen] = useState(false)
  const useCustomTrigger = typeof renderTrigger === "function"
  const useTabTrigger = !useCustomTrigger && triggerVariant === "tab"

  const triggerLabel = resolveTriggerLabel({
    value: normalizedValue,
    presets: normalizedPresets,
    emptyLabel,
    formatValueLabel,
  })
  // FormTabTrigger owns error id wiring; default trigger needs it here.
  const describedBy = [
    ariaDescribedBy,
    !useTabTrigger && !useCustomTrigger && showError ? errorId : undefined,
  ]
    .filter(Boolean)
    .join(" ")

  const openPicker = () => {
    if (isInteractionLocked) {
      return
    }

    setIsOpen(true)
  }

  const closePicker = () => {
    setIsOpen(false)
  }

  const handleSelect = (
    nextValue: string | null,
    options?: { keepOpen?: boolean },
  ) => {
    if (isInteractionLocked) {
      return
    }

    if (nextValue !== normalizedValue) {
      onChange(nextValue)
    }

    if (!options?.keepOpen) {
      closePicker()
    }
  }

  return (
    <div
      className={cn(
        "min-w-0",
        (useTabTrigger || useCustomTrigger) && "inline-flex shrink-0",
        className,
      )}
    >
      {useCustomTrigger ? (
        renderTrigger({
          id: triggerId,
          isOpen,
          disabled,
          isLoading,
          readOnly,
          required,
          triggerLabel,
          error,
          "aria-label": ariaLabel,
          "aria-describedby": describedBy || undefined,
          "aria-invalid": isAriaInvalid || undefined,
          openPicker,
        })
      ) : useTabTrigger ? (
        <FormTabTrigger
          id={triggerId}
          label={triggerLabel}
          icon={triggerIcon}
          disabled={disabled}
          isLoading={isLoading}
          readOnly={readOnly}
          required={required}
          error={error}
          aria-label={ariaLabel}
          aria-describedby={describedBy || undefined}
          aria-invalid={isAriaInvalid || undefined}
          aria-expanded={isOpen}
          className={triggerClassName}
          onClick={openPicker}
        />
      ) : (
        <button
          id={triggerId}
          type="button"
          disabled={disabled || isLoading}
          aria-label={ariaLabel}
          aria-required={required || undefined}
          aria-readonly={readOnly || undefined}
          aria-busy={isLoading || undefined}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-describedby={describedBy || undefined}
          aria-invalid={isAriaInvalid || undefined}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm text-slate-950 transition-colors outline-none hover:bg-slate-50 focus-visible:border-slate-950 focus-visible:ring-2 focus-visible:ring-slate-950/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60",
            readOnly && "cursor-default bg-slate-50 hover:bg-slate-50",
            isAriaInvalid &&
              "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20",
            triggerClassName,
          )}
          onClick={openPicker}
        >
          <span className="min-w-0 truncate font-medium">{triggerLabel}</span>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-500">
            {isLoading ? (
              <>
                <LoaderIcon
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                />
                Loading
              </>
            ) : readOnly ? (
              "View only"
            ) : (
              "Change"
            )}
          </span>
        </button>
      )}

      {showError && !useTabTrigger && !useCustomTrigger && (
        <p
          id={errorId}
          className="mt-2 text-sm font-medium text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}

      <ResponsiveScreenModal
        isOpen={isOpen}
        onClose={closePicker}
        ariaLabel={modalTitle}
        panelClassName="md:h-auto md:max-h-[min(720px,calc(100dvh-2rem))] md:max-w-md"
      >
        {({ requestClose }) => (
          <>
            <ModalDismissHeader
              title={modalTitle}
              onClose={requestClose}
              className="shrink-0 border-b border-slate-100 px-4 py-3 md:px-5"
            />

            <DateDayCalendar
              value={normalizedValue}
              onSelect={handleSelect}
              presets={presets}
              relativeMonthJumps={relativeMonthJumps}
              relativeMonthJumpsLabel={relativeMonthJumpsLabel}
              minDate={minDate}
              maxDate={maxDate}
              disablePast={disablePast}
              referenceDate={resolvedReferenceDate}
            />
          </>
        )}
      </ResponsiveScreenModal>
    </div>
  )
}
