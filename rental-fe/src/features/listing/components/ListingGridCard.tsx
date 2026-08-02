import { memo, useMemo, type MouseEvent } from "react"
import { Link } from "react-router-dom"

import { ListingAvailabilityDisplay } from "./ListingAvailabilityDisplay"
import { ListingGridCoverImage } from "./ListingGridCoverImage"
import {
  ListingGridCardBadge,
  ListingGridCardOverlayContent,
} from "./grid-preview"
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

function getListingGridCoverPhoto(listing: ListingGridCardListing) {
  const [coverPhoto] = getSortedListingPhotos(listing.media)
  return coverPhoto ?? null
}

function getListingGridCoverAlt(
  photo: ReturnType<typeof getListingGridCoverPhoto>,
) {
  const alt = typeof photo?.alt === "string" ? photo.alt.trim() : ""
  return alt || "Listing photo"
}

function ListingGridCardComponent({
  listing,
  overlayDensity = "compact",
  showBuildingName = true,
  onActivate,
}: ListingGridCardProps) {
  const coverPhoto = useMemo(
    () => getListingGridCoverPhoto(listing),
    [listing.media],
  )
  const coverAlt = getListingGridCoverAlt(coverPhoto)

  const content = (
    <>
      <ListingGridCoverImage
        src={coverPhoto?.secureUrl}
        alt={coverAlt}
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
    const handleActivate = (event: MouseEvent<HTMLButtonElement>) => {
      onActivate(listing, event.currentTarget)
    }

    return (
      <button
        type="button"
        className={listingGridCardSurfaceClassName}
        aria-label={`Open listing ${formatCompactMoney(listing.rent)}`}
        onClick={handleActivate}
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

function listingGridCardPropsAreEqual(
  previous: ListingGridCardProps,
  next: ListingGridCardProps,
) {
  return (
    previous.listing === next.listing &&
    previous.overlayDensity === next.overlayDensity &&
    previous.showBuildingName === next.showBuildingName &&
    previous.onActivate === next.onActivate
  )
}

export const ListingGridCard = memo(
  ListingGridCardComponent,
  listingGridCardPropsAreEqual,
)
