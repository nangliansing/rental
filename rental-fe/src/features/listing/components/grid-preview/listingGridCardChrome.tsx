import { Lock } from "lucide-react"

import { cn } from "@/lib/utils"

import {
  LISTING_AVAILABILITY_INDICATOR_CLASS_NAME,
  LISTING_GRID_AVAILABLE_NOW_INDICATOR_CLASS_NAME,
  ListingAvailabilityDisplay,
} from "../ListingAvailabilityDisplay"
import { listingGridCardBadgeClassName } from "../ListingGridCardPrimitives"
import type { ListingGridCardListing } from "../listingGridCardTypes"
import { formatContract } from "../../utils/listingDisplay"

export {
  LISTING_AVAILABILITY_INDICATOR_CLASS_NAME,
  LISTING_GRID_AVAILABLE_NOW_INDICATOR_CLASS_NAME,
}

export function ListingGridCardAvailableNowIndicator({
  show,
}: {
  show: boolean
}) {
  if (!show) {
    return null
  }

  return (
    <span
      className={LISTING_AVAILABILITY_INDICATOR_CLASS_NAME}
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
  return (
    <ListingAvailabilityDisplay
      availableAt={listing.availableAt}
      variant="badge"
    />
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
