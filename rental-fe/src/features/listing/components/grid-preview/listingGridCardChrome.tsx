import { Lock } from "lucide-react"

import { cn } from "@/lib/utils"

import { listingGridCardBadgeClassName } from "../ListingGridCardPrimitives"
import type { ListingGridCardListing } from "../listingGridCardTypes"
import { formatContract } from "../../utils/listingDisplay"
import {
  getListingAvailabilityBadgePresentation,
  type ListingAvailabilityBadgeTone,
} from "../../utils/listingAvailability"

export const LISTING_GRID_AVAILABLE_NOW_INDICATOR_CLASS_NAME =
  "absolute left-2 top-2 z-10 size-3 rounded-full bg-emerald-500 shadow-[0_0_0_1.5px_rgba(255,255,255,0.9),0_1px_3px_rgba(15,23,42,0.5)]"

function getAvailabilityBadgeToneClassName(tone: ListingAvailabilityBadgeTone) {
  return tone === "active"
    ? "border-emerald-300/30 bg-emerald-600/90"
    : "border-white/35 bg-slate-950/45"
}

export function ListingGridCardAvailableNowIndicator({
  show,
}: {
  show: boolean
}) {
  if (!show) return null

  return (
    <span
      className={LISTING_GRID_AVAILABLE_NOW_INDICATOR_CLASS_NAME}
      aria-label="Available now"
      title="Available now"
    />
  )
}

export function ListingGridCardAvailabilityBadge({
  listing,
}: {
  listing: ListingGridCardListing
}) {
  const presentation = getListingAvailabilityBadgePresentation(listing.availableAt)

  return (
    <div
      className={cn(
        "absolute left-2 top-2 max-w-[calc(100%-5rem)] truncate border px-2 text-white shadow-sm",
        listingGridCardBadgeClassName,
        getAvailabilityBadgeToneClassName(presentation.tone),
      )}
    >
      <span className="truncate text-[11px] font-semibold leading-none">
        {presentation.label}
      </span>
    </div>
  )
}

export function ListingGridCardBadge({
  listing,
}: {
  listing: ListingGridCardListing
}) {
  return (
    <div
      className={cn(
        "absolute right-2 top-2 overflow-hidden border border-white/35 bg-slate-950/45 text-white shadow-sm",
        listingGridCardBadgeClassName,
      )}
    >
      {listing.visibility === "PRIVATE" && (
        <span
          className="flex h-full w-7 shrink-0 items-center justify-center border-r border-white/20"
          aria-label="Private listing"
          title="Private listing"
        >
          <Lock className="h-3.5 w-3.5" />
        </span>
      )}
      <span className="px-2 text-[11px] font-semibold leading-none">
        {formatContract(listing.contractMonths)}
      </span>
    </div>
  )
}
