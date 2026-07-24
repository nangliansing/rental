import {
  CookingPot,
  Droplet,
  Lock,
  PawPrint,
  Zap,
} from "lucide-react"
import { Link } from "react-router-dom"

import type { SearchListing } from "@/features/map-search/types"

import {
  ListingCoverImage,
  ListingPrice,
  ListingRoomSummary,
} from "./ListingPresentationPrimitives"
import {
  ListingGridCardFinePrint,
  ListingGridCardMetaText,
  ListingGridCardOverlay,
  ListingGridCardPriceText,
  ListingGridCardTitleText,
  listingGridCardBadgeClassName,
  listingGridCardSurfaceClassName,
} from "./ListingGridCardPrimitives"
import {
  formatCompactMoney,
  formatContract,
  formatRate,
  getSortedListingPhotos,
} from "../utils/listingDisplay"

export type ListingGridCardListing = SearchListing & {
  building?: {
    name?: string | null
  } | null
}

type ListingGridCardProps = {
  listing: ListingGridCardListing
  onOpen?: (listingId: string, trigger: HTMLButtonElement) => void
}

export function ListingGridCard({ listing, onOpen }: ListingGridCardProps) {
  const [coverPhoto] = getSortedListingPhotos(listing.media)
  const buildingName = listing.building?.name?.trim()
  const content = (
    <>
      <ListingCoverImage
        photo={coverPhoto}
        className="transition duration-200 group-hover:scale-[1.03]"
        fallbackClassName="text-slate-300"
      />

      <div className={`absolute right-2 top-2 overflow-hidden border border-white/35 bg-slate-950/45 text-white shadow-sm ${listingGridCardBadgeClassName}`}>
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

      <ListingGridCardOverlay>
          <ListingGridCardPriceText>
            <ListingPrice value={listing.rent} />
          </ListingGridCardPriceText>
          {buildingName && (
            <ListingGridCardTitleText>
              {buildingName}
            </ListingGridCardTitleText>
          )}
          <ListingGridCardMetaText>
            <ListingRoomSummary
              bedroomCount={listing.bedroomCount}
              size={listing.size}
              className="truncate"
            />
            {listing.isCookingAllowed && (
              <CookingPot
                className="h-3 w-3 shrink-0"
                aria-label="Cooking allowed"
              />
            )}
            {listing.isPetAllowed && (
              <PawPrint
                className="h-3 w-3 shrink-0"
                aria-label="Pets allowed"
              />
            )}
          </ListingGridCardMetaText>
          <ListingGridCardFinePrint>
            <span className="shrink-0">
              Dep {formatCompactMoney(listing.deposit)}
            </span>
            <span className="shrink-0">
              Move {formatCompactMoney(listing.moveInCost)}
            </span>
            {listing.electricRate != null && (
              <span className="inline-flex shrink-0 items-center gap-0.5">
                <Zap className="h-3 w-3 shrink-0" />
                <span>{formatRate(listing.electricRate)}</span>
              </span>
            )}
            {listing.waterRate != null && (
              <span className="inline-flex min-w-0 items-center gap-0.5">
                <Droplet className="h-3 w-3 shrink-0" />
                <span className="truncate">{formatRate(listing.waterRate)}</span>
              </span>
            )}
          </ListingGridCardFinePrint>
      </ListingGridCardOverlay>
    </>
  )

  if (onOpen) {
    return (
      <button
        type="button"
        className={listingGridCardSurfaceClassName}
        aria-label={`Open listing ${formatCompactMoney(listing.rent)}`}
        onClick={(event) => onOpen(listing._id, event.currentTarget)}
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
