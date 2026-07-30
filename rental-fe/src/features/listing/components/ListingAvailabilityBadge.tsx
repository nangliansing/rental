import { useId } from "react"

import { cn } from "@/lib/utils"

import {
  getListingAvailabilityDisplay,
  normalizeListingAvailableAt,
  parseAvailableAtToFormFields,
  serializeListingAvailabilityForApi,
  toListingAvailabilityDateKey,
  type ListingAvailabilityDisplay as ListingAvailabilityDisplayData,
  type ListingAvailabilityFormFields,
} from "../utils/listingAvailability"
import { normalizeDialogErrorMessage } from "../utils/normalizeDialogErrorMessage"
import { ListingAvailabilityDisplay } from "./ListingAvailabilityDisplay"
import { ListingAvailabilityField } from "./ListingAvailabilityField"

export type ListingAvailabilityBadgeProps = {
  availableAt: string | null
  isEditable?: boolean
  isSubmitting?: boolean
  errorMessage?: string | null
  onAvailableAtChange?: (availableAt: string | null) => void
  referenceDate?: Date
  className?: string
}

type BadgeVisualStatus = "idle" | "loading" | "error"

function getBadgeToneClassName(
  display: ListingAvailabilityDisplayData,
  status: BadgeVisualStatus,
) {
  if (status === "error") {
    return "border-rose-200/25 bg-rose-600/90 text-white"
  }

  if (display.tone === "active") {
    return "border-emerald-300/30 bg-emerald-600/90 text-white"
  }

  return undefined
}

function getBadgeHoverClassName(
  display: ListingAvailabilityDisplayData,
  status: BadgeVisualStatus,
  isInteractive: boolean,
) {
  if (!isInteractive || status === "loading") {
    return undefined
  }

  if (status === "error") {
    return "transition-colors hover:bg-rose-600"
  }

  if (display.tone === "active") {
    return "transition-colors hover:bg-emerald-600"
  }

  return "transition-colors hover:bg-black/75"
}

function getBadgeTriggerAriaLabel(
  display: ListingAvailabilityDisplayData,
  status: BadgeVisualStatus,
) {
  if (status === "loading") {
    return "Saving availability"
  }

  if (status === "error") {
    return `Availability update failed. ${display.label}. Tap to retry.`
  }

  return `Edit availability: ${display.label}`
}

/** Pure visual face — no picker/API knowledge. */
function ListingAvailabilityBadgeFace({
  display,
  status = "idle",
  className,
  ariaLabel,
}: {
  display: ListingAvailabilityDisplayData
  status?: BadgeVisualStatus
  className?: string
  ariaLabel?: string
}) {
  return (
    <ListingAvailabilityDisplay
      display={display}
      variant="full"
      showIcon
      status={status}
      className={className}
      ariaLabel={ariaLabel ?? display.label}
    />
  )
}

/** Owner path — reuses ListingAvailabilityField / DateDayPicker. */
function EditableListingAvailabilityBadge({
  availableAt,
  display,
  isSubmitting,
  errorMessage,
  referenceDate,
  className,
  onAvailableAtChange,
}: {
  availableAt: string | null
  display: ListingAvailabilityDisplayData
  isSubmitting: boolean
  errorMessage: string
  referenceDate?: Date
  className?: string
  onAvailableAtChange: (availableAt: string | null) => void
}) {
  const errorId = useId()
  const hasError = Boolean(errorMessage) && !isSubmitting
  const status: BadgeVisualStatus = isSubmitting
    ? "loading"
    : hasError
      ? "error"
      : "idle"
  const formValue = parseAvailableAtToFormFields(availableAt, referenceDate)
  const currentDateKey = toListingAvailabilityDateKey(availableAt)

  const handleFieldsChange = (fields: ListingAvailabilityFormFields) => {
    const nextDateKey = serializeListingAvailabilityForApi(fields, referenceDate)

    if (nextDateKey === currentDateKey) {
      return
    }

    onAvailableAtChange(nextDateKey)
  }

  const faceClassName = cn(
    getBadgeToneClassName(display, status),
    getBadgeHoverClassName(display, status, true),
    isSubmitting && "opacity-90",
    className,
  )

  return (
    <ListingAvailabilityField
      value={formValue}
      onChange={handleFieldsChange}
      isLoading={isSubmitting}
      referenceDate={referenceDate}
      className="inline-flex"
      aria-describedby={hasError ? errorId : undefined}
      aria-invalid={hasError || undefined}
      renderTrigger={({
        id,
        isOpen,
        disabled,
        isLoading,
        openPicker,
        "aria-describedby": ariaDescribedBy,
        "aria-invalid": ariaInvalid,
      }) => (
        <span className="inline-flex flex-col items-start gap-1">
          <button
            id={id}
            type="button"
            disabled={disabled || isLoading}
            title={hasError ? errorMessage : undefined}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            aria-busy={isLoading || undefined}
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid}
            aria-label={getBadgeTriggerAriaLabel(display, status)}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent disabled:cursor-not-allowed"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              openPicker()
            }}
          >
            <ListingAvailabilityBadgeFace
              display={display}
              status={status}
              className={faceClassName}
            />
          </button>

          {hasError ? (
            <span
              id={errorId}
              role="alert"
              className="max-w-[11rem] rounded-full border border-white/15 bg-rose-600/90 px-2 py-1 text-[10px] font-medium leading-snug text-white shadow-sm backdrop-blur-md"
            >
              {errorMessage}
            </span>
          ) : null}
        </span>
      )}
    />
  )
}

export function ListingAvailabilityBadge({
  availableAt,
  isEditable = false,
  isSubmitting = false,
  errorMessage,
  onAvailableAtChange,
  referenceDate,
  className,
}: ListingAvailabilityBadgeProps) {
  const safeAvailableAt = normalizeListingAvailableAt(availableAt)
  const display = getListingAvailabilityDisplay(safeAvailableAt, referenceDate)
  const normalizedErrorMessage = normalizeDialogErrorMessage(errorMessage)
  const canEdit = isEditable && typeof onAvailableAtChange === "function"

  if (!canEdit) {
    return (
      <ListingAvailabilityBadgeFace
        display={display}
        className={cn(
          getBadgeToneClassName(display, "idle"),
          "pointer-events-none",
          className,
        )}
        ariaLabel={display.label}
      />
    )
  }

  return (
    <EditableListingAvailabilityBadge
      availableAt={safeAvailableAt}
      display={display}
      isSubmitting={isSubmitting}
      errorMessage={normalizedErrorMessage}
      referenceDate={referenceDate}
      className={className}
      onAvailableAtChange={onAvailableAtChange}
    />
  )
}
