import { AlertCircle, CalendarDays, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

import {
  getListingAvailabilityDisplay,
  type ListingAvailabilityBadgeTone,
  type ListingAvailabilityDisplay as ListingAvailabilityDisplayData,
} from "../utils/listingAvailability"
import { listingGridCardBadgeClassName } from "./ListingGridCardPrimitives"

export const LISTING_AVAILABILITY_INDICATOR_CLASS_NAME =
  "absolute left-2 top-2 z-10 size-3 rounded-full bg-emerald-500 shadow-[0_0_0_1.5px_rgba(255,255,255,0.9),0_1px_3px_rgba(15,23,42,0.5)]"

/** @deprecated Use LISTING_AVAILABILITY_INDICATOR_CLASS_NAME */
export const LISTING_GRID_AVAILABLE_NOW_INDICATOR_CLASS_NAME =
  LISTING_AVAILABILITY_INDICATOR_CLASS_NAME

const PHOTO_OVERLAY_BADGE_CLASS_NAME =
  "inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/65 px-2.5 py-1 text-xs font-semibold leading-none text-white shadow-sm backdrop-blur-md"

const BADGE_ICON_CLASS_NAME = "h-3.5 w-3.5 shrink-0"

const GRID_BADGE_POSITION_CLASS_NAME =
  "absolute left-2 top-2 z-10 max-w-[calc(100%-5rem)] truncate border px-2 text-white shadow-sm"

const COMPACT_DATE_BADGE_CLASS_NAME =
  "absolute left-2 top-2 z-10 max-w-[calc(100%-4rem)] truncate rounded-full border border-white/35 bg-slate-950/45 px-2 py-0.5 text-[11px] font-semibold leading-none text-white shadow-sm backdrop-blur-sm"

export type ListingAvailabilityDisplayVariant =
  | "indicator"
  | "compact"
  | "badge"
  | "full"

export type ListingAvailabilityDisplayStatus = "idle" | "loading" | "error"

export type ListingAvailabilityDisplayProps = {
  availableAt?: unknown
  display?: ListingAvailabilityDisplayData
  variant?: ListingAvailabilityDisplayVariant
  showIcon?: boolean
  referenceDate?: Date
  className?: string
  status?: ListingAvailabilityDisplayStatus
  ariaLabel?: string
}

function getAvailabilityToneClassName(
  tone: ListingAvailabilityBadgeTone,
  status: ListingAvailabilityDisplayStatus,
  fallback?: string,
) {
  if (status === "error") {
    return "border-rose-200/25 bg-rose-600/90 text-white"
  }

  if (tone === "active") {
    return "border-emerald-300/30 bg-emerald-600/90 text-white"
  }

  return fallback
}

function AvailableNowIndicator({
  ariaLabel,
  className,
}: {
  ariaLabel: string
  className?: string
}) {
  return (
    <span
      className={cn(LISTING_AVAILABILITY_INDICATOR_CLASS_NAME, className)}
      aria-label={ariaLabel}
      title={ariaLabel}
    />
  )
}

function resolveDisplay({
  availableAt,
  display,
  referenceDate,
}: Pick<
  ListingAvailabilityDisplayProps,
  "availableAt" | "display" | "referenceDate"
>) {
  return display ?? getListingAvailabilityDisplay(availableAt, referenceDate)
}

export function ListingAvailabilityDisplay({
  availableAt,
  display,
  variant = "full",
  showIcon,
  referenceDate,
  className,
  status = "idle",
  ariaLabel,
}: ListingAvailabilityDisplayProps) {
  const resolvedDisplay = resolveDisplay({ availableAt, display, referenceDate })
  const resolvedAriaLabel = ariaLabel ?? resolvedDisplay.ariaLabel

  if (variant === "indicator") {
    if (!resolvedDisplay.isAvailableNow) {
      return null
    }

    return (
      <AvailableNowIndicator
        ariaLabel={resolvedAriaLabel}
        className={className}
      />
    )
  }

  if (variant === "compact") {
    if (resolvedDisplay.kind === "flexible") {
      return null
    }

    if (resolvedDisplay.isAvailableNow) {
      return (
        <AvailableNowIndicator
          ariaLabel={resolvedAriaLabel}
          className={className}
        />
      )
    }

    if (!resolvedDisplay.shortDateLabel) {
      return null
    }

    return (
      <div
        className={cn(COMPACT_DATE_BADGE_CLASS_NAME, className)}
        aria-label={resolvedAriaLabel}
        title={resolvedAriaLabel}
      >
        <span className="truncate">{resolvedDisplay.shortDateLabel}</span>
      </div>
    )
  }

  if (variant === "badge") {
    return (
      <div
        className={cn(
          GRID_BADGE_POSITION_CLASS_NAME,
          listingGridCardBadgeClassName,
          getAvailabilityToneClassName(
            resolvedDisplay.tone,
            status,
            "border-white/35 bg-slate-950/45",
          ),
          className,
        )}
        aria-label={resolvedAriaLabel}
        title={resolvedAriaLabel}
      >
        <span className="truncate text-[11px] font-semibold leading-none">
          {status === "loading" ? "Saving..." : resolvedDisplay.label}
        </span>
      </div>
    )
  }

  const shouldShowIcon = showIcon ?? true
  const Icon =
    status === "loading"
      ? Loader2
      : status === "error"
        ? AlertCircle
        : CalendarDays

  return (
    <span
      className={cn(
        PHOTO_OVERLAY_BADGE_CLASS_NAME,
        getAvailabilityToneClassName(resolvedDisplay.tone, status),
        className,
      )}
      aria-label={resolvedAriaLabel}
    >
      {shouldShowIcon ? (
        <Icon
          aria-hidden="true"
          className={cn(
            BADGE_ICON_CLASS_NAME,
            status === "loading" && "animate-spin",
          )}
          strokeWidth={2.25}
        />
      ) : null}
      <span className="truncate">
        {status === "loading" ? "Saving..." : resolvedDisplay.label}
      </span>
    </span>
  )
}
