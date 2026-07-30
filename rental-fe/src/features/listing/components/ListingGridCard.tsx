import { Link } from "react-router-dom"

import {
  ListingCoverImage,
} from "./ListingPresentationPrimitives"
import {
  ListingGridCardAvailableNowIndicator,
  ListingGridCardBadge,
  ListingGridCardOverlayContent,
} from "./grid-preview"
import { listingGridCardSurfaceClassName } from "./ListingGridCardPrimitives"
import type { ListingGridCardListing } from "./listingGridCardTypes"
import { isListingAvailableNow } from "../utils/listingAvailability"
import {
  formatCompactMoney,
  getSortedListingPhotos,
} from "../utils/listingDisplay"

export type { ListingGridCardListing } from "./listingGridCardTypes"

type ListingGridCardProps = {
  listing: ListingGridCardListing
  overlayDensity?: "compact" | "full"
  showBuildingName?: boolean
  onActivate?: (
    listing: ListingGridCardListing,
    trigger: HTMLButtonElement,
  ) => void
}

export function ListingGridCard({
  listing,
  overlayDensity = "compact",
  showBuildingName = true,
  onActivate,
}: ListingGridCardProps) {
  const [coverPhoto] = getSortedListingPhotos(listing.media)
  const isAvailableNow = isListingAvailableNow(listing.availableAt)
  const content = (
    <>
      <ListingCoverImage
        photo={coverPhoto}
        className="transition duration-200 group-hover:scale-[1.03]"
        fallbackClassName="text-slate-300"
      />

      <ListingGridCardAvailableNowIndicator show={isAvailableNow} />
      <ListingGridCardBadge listing={listing} />

      <ListingGridCardOverlayContent
        listing={listing}
        showBuildingName={showBuildingName}
        showFinePrint={overlayDensity === "full"}
      />
    </>
  )

  if (onActivate) {
    return (
      <button
        type="button"
        className={listingGridCardSurfaceClassName}
        aria-label={`Open listing ${formatCompactMoney(listing.rent)}`}
        onClick={(event) => onActivate(listing, event.currentTarget)}
      >
        {content}
      </button>
    )
  }

  return (
    <Link
      to={`/listings/${listing._id}`}
      className={listingGridCardSurfaceClassName}
      aria-label={`Open listing ${formatCompactMoney(listing.rent)}`}
    >
      {content}
    </Link>
  )
}
