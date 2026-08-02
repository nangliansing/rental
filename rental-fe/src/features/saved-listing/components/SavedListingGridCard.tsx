import { Heart } from "lucide-react"
import { memo, type MouseEvent } from "react"

import {
  ListingPrice,
  ListingRoomSummary,
} from "@/features/listing/components/ListingPresentationPrimitives"
import { ListingGridCoverImage } from "@/features/listing/components/ListingGridCoverImage"
import {
  ListingGridCardMetaText,
  ListingGridCardOverlay,
  ListingGridCardPriceText,
  ListingGridCardTitleText,
  listingGridCardSurfaceClassName,
} from "@/features/listing/components/ListingGridCardPrimitives"
import { cn } from "@/lib/utils"

import type { SearchSavedListing } from "../api"
import {
  getLiveSavedListing,
  getSavedListingBuildingName,
  getSavedListingCover,
  getSavedListingTitle,
} from "../utils/savedListingDisplay"

type SavedListingGridCardProps = {
  savedListing: SearchSavedListing
  isDeleting?: boolean
  showUnsaveButton?: boolean
  onUnsave?: (savedListing: SearchSavedListing) => void
  onOpen: (listingId: string) => void
}

export const SavedListingGridCard = memo(function SavedListingGridCard({
  savedListing,
  isDeleting = false,
  showUnsaveButton = false,
  onUnsave,
  onOpen,
}: SavedListingGridCardProps) {
  const liveListing = getLiveSavedListing(savedListing)
  const coverPhoto = getSavedListingCover(savedListing)

  const handleUnsave = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    onUnsave?.(savedListing)
  }

  const visualContent = (
    <>
      <ListingGridCoverImage
        src={coverPhoto?.secureUrl}
        alt={coverPhoto?.alt?.trim() || "Saved listing photo"}
        fallbackClassName="text-slate-300"
      />

      <ListingGridCardOverlay>
        <ListingGridCardPriceText>
          {liveListing?.rent != null || savedListing.snapshot?.rent != null ? (
            <ListingPrice
              value={liveListing?.rent ?? savedListing.snapshot?.rent}
            />
          ) : (
            "Saved room"
          )}
        </ListingGridCardPriceText>
        <ListingGridCardTitleText>
          {getSavedListingBuildingName(savedListing)}
        </ListingGridCardTitleText>
        {liveListing ? (
          <ListingGridCardMetaText>
            <ListingRoomSummary
              bedroomCount={liveListing.bedroomCount}
              size={liveListing.size}
            />
          </ListingGridCardMetaText>
        ) : (
          <ListingGridCardMetaText className="text-amber-100">
            No longer available
          </ListingGridCardMetaText>
        )}
      </ListingGridCardOverlay>

    </>
  )

  const unsaveButton = showUnsaveButton && onUnsave && (
    <button
      type="button"
      aria-label="Remove saved listing"
      aria-pressed="true"
      className={cn(
        "absolute right-2.5 top-2.5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/75 bg-white/95 text-rose-500 shadow-[0_8px_24px_rgba(15,23,42,0.16)] backdrop-blur-md transition duration-200 hover:scale-105 hover:bg-white hover:text-rose-600 active:scale-95 disabled:cursor-not-allowed",
        isDeleting && "scale-95 opacity-60",
      )}
      disabled={isDeleting}
      onClick={handleUnsave}
    >
      <Heart
        aria-hidden="true"
        className={cn(
          "h-5 w-5 fill-current transition-transform duration-200",
          !isDeleting && "animate-[save-heart-pop_420ms_ease-out]",
        )}
      />
    </button>
  )

  if (!liveListing) {
    return (
      <div className={listingGridCardSurfaceClassName}>
        {visualContent}
        {unsaveButton}
      </div>
    )
  }

  return (
    <div className={listingGridCardSurfaceClassName}>
      <button
        type="button"
        className="absolute inset-0 block h-full w-full text-left"
        aria-label={`Open saved listing ${getSavedListingTitle(savedListing)}`}
        onClick={() => onOpen(liveListing._id)}
      >
        {visualContent}
      </button>
      {unsaveButton}
    </div>
  )
})
