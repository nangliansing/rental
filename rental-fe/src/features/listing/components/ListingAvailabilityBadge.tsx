import { AlertCircle, CalendarDays, Loader2 } from "lucide-react"
import { useId } from "react"

import { cn } from "@/lib/utils"

import {
  getListingAvailabilityBadgePresentation,
  parseAvailableAtToFormFields,
  serializeListingAvailabilityForApi,
  toListingAvailabilityDateKey,
  type ListingAvailabilityBadgePresentation,
  type ListingAvailabilityFormFields,
} from "../utils/listingAvailability"
import { normalizeDialogErrorMessage } from "../utils/normalizeDialogErrorMessage"
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

/** Same type scale/padding as ListingPhotoCarousel count chip (`text-xs px-2.5 py-1`). */
const PHOTO_OVERLAY_BADGE_CLASS_NAME =
  "inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/65 px-2.5 py-1 text-xs font-semibold leading-none text-white shadow-sm backdrop-blur-md"

const BADGE_ICON_CLASS_NAME = "h-3.5 w-3.5 shrink-0"

type BadgeVisualStatus = "idle" | "loading" | "error"

function getBadgeToneClassName(
  presentation: ListingAvailabilityBadgePresentation,
  status: BadgeVisualStatus,
) {
  if (status === "error") {
    return "border-rose-200/25 bg-rose-600/90 text-white"
  }

  if (presentation.tone === "active") {
    return "border-emerald-300/30 bg-emerald-600/90 text-white"
  }

  return undefined
}

function getBadgeHoverClassName(
  presentation: ListingAvailabilityBadgePresentation,
  status: BadgeVisualStatus,
  isInteractive: boolean,
) {
  if (!isInteractive || status === "loading") {
    return undefined
  }

  if (status === "error") {
    return "transition-colors hover:bg-rose-600"
  }

  if (presentation.tone === "active") {
    return "transition-colors hover:bg-emerald-600"
  }

  return "transition-colors hover:bg-black/75"
}

function getBadgeTriggerAriaLabel(
  presentation: ListingAvailabilityBadgePresentation,
  status: BadgeVisualStatus,
) {
  if (status === "loading") {
    return "Saving availability"
  }

  if (status === "error") {
    return `Availability update failed. ${presentation.label}. Tap to retry.`
  }

  return `Edit availability: ${presentation.label}`
}

/** Pure visual face — no picker/API knowledge. */
function ListingAvailabilityBadgeFace({
  presentation,
  status = "idle",
  className,
  ariaLabel,
}: {
  presentation: ListingAvailabilityBadgePresentation
  status?: BadgeVisualStatus
  className?: string
  ariaLabel?: string
}) {
  const Icon =
    status === "loading"
      ? Loader2
      : status === "error"
        ? AlertCircle
        : CalendarDays

  return (
    <span
      className={cn(PHOTO_OVERLAY_BADGE_CLASS_NAME, className)}
      aria-label={ariaLabel}
    >
      <Icon
        aria-hidden="true"
        className={cn(BADGE_ICON_CLASS_NAME, status === "loading" && "animate-spin")}
        strokeWidth={2.25}
      />
      <span className="truncate">
        {status === "loading" ? "Saving..." : presentation.label}
      </span>
    </span>
  )
}

/** Owner path — reuses ListingAvailabilityField / DateDayPicker. */
function EditableListingAvailabilityBadge({
  availableAt,
  presentation,
  isSubmitting,
  errorMessage,
  referenceDate,
  className,
  onAvailableAtChange,
}: {
  availableAt: string | null
  presentation: ListingAvailabilityBadgePresentation
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
    getBadgeToneClassName(presentation, status),
    getBadgeHoverClassName(presentation, status, true),
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
            aria-label={getBadgeTriggerAriaLabel(presentation, status)}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-1 focus-visible:ring-offset-transparent disabled:cursor-not-allowed"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              openPicker()
            }}
          >
            <ListingAvailabilityBadgeFace
              presentation={presentation}
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
  const safeAvailableAt =
    typeof availableAt === "string" || availableAt === null ? availableAt : null
  const presentation = getListingAvailabilityBadgePresentation(
    safeAvailableAt,
    referenceDate,
  )
  const normalizedErrorMessage = normalizeDialogErrorMessage(errorMessage)
  const canEdit = isEditable && typeof onAvailableAtChange === "function"

  if (!canEdit) {
    return (
      <ListingAvailabilityBadgeFace
        presentation={presentation}
        className={cn(
          getBadgeToneClassName(presentation, "idle"),
          "pointer-events-none",
          className,
        )}
        ariaLabel={presentation.label}
      />
    )
  }

  return (
    <EditableListingAvailabilityBadge
      availableAt={safeAvailableAt}
      presentation={presentation}
      isSubmitting={isSubmitting}
      errorMessage={normalizedErrorMessage}
      referenceDate={referenceDate}
      className={className}
      onAvailableAtChange={onAvailableAtChange}
    />
  )
}
