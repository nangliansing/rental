import { Link } from "react-router-dom"

import {
  ListingCoverImage,
} from "./ListingPresentationPrimitives"
import {
  ListingGridCardBadge,
  ListingGridCardOverlayContent,
} from "./grid-preview"
import { ListingAvailabilityDisplay } from "./ListingAvailabilityDisplay"
import { listingGridCardSurfaceClassName } from "./ListingGridCardPrimitives"
import type { ListingGridCardListing } from "./listingGridCardTypes"
import { LISTING_GRID_CARD_AVAILABILITY_VARIANT } from "../utils/listingGridAvailabilityVariant"
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
  const content = (
    <>
      <ListingCoverImage
        photo={coverPhoto}
        className="transition duration-200 group-hover:scale-[1.03]"
        fallbackClassName="text-slate-300"
      />

      <ListingAvailabilityDisplay
        availableAt={listing.availableAt}
        variant={LISTING_GRID_CARD_AVAILABILITY_VARIANT}
      />
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
