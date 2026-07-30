import {
  Bath,
  Bed,
  CookingPot,
  Droplet,
  PawPrint,
  Users,
  Zap,
} from "lucide-react"

import {
  ListingCoverImage,
  ListingPrice,
} from "@/features/listing/components/ListingPresentationPrimitives"
import { ListingAvailabilityDisplay } from "@/features/listing/components/ListingAvailabilityDisplay"
import { LISTING_GRID_AVAILABILITY_VARIANT } from "@/features/listing/utils/listingGridAvailabilityVariant"
import { formatBedroom } from "@/features/listing/utils/listingDisplay"
import type { BuildingListing } from "../../types"
import {
  formatBedroomCount,
  formatCompactBaht,
  formatContract,
  formatRate,
  getListingCoverUrl,
} from "../../utils/building-display"

type BuildingListingPreviewProps = {
  listing: BuildingListing
}

function PreviewSeparator() {
  return <span className="shrink-0 text-white/50">·</span>
}

export function BuildingListingPreview({ listing }: BuildingListingPreviewProps) {
  const photoUrl = getListingCoverUrl(listing)

  return (
    <div className="relative h-[200px] w-[280px] shrink-0 overflow-hidden rounded-md bg-slate-800">
      <ListingCoverImage
        photo={photoUrl ? { secureUrl: photoUrl } : null}
        altFallback="Room preview"
        fallbackLabel="No photo"
        fallbackClassName="bg-slate-800 text-white/60"
      />

      <ListingAvailabilityDisplay
        availableAt={listing.availableAt}
        variant={LISTING_GRID_AVAILABILITY_VARIANT.timing}
      />

      <div className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-950 shadow-sm backdrop-blur-sm">
        {formatContract(listing.contractMonths)}
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/92 via-slate-950/60 to-transparent px-2.5 pb-2 pt-11 text-white">
        <p className="text-lg font-semibold leading-none">
          <ListingPrice value={listing.rent} />
        </p>

        <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] font-medium leading-4 text-white/92">
          <span
            className="flex shrink-0 items-center gap-0.5"
            aria-label={formatBedroom(listing.bedroomCount)}
          >
            {listing.bedroomCount === 0 ? (
              formatBedroomCount(listing.bedroomCount)
            ) : (
              <>
                <Bed className="h-3 w-3" />
                {formatBedroomCount(listing.bedroomCount)}
              </>
            )}
          </span>
          <PreviewSeparator />
          <span className="flex shrink-0 items-center gap-0.5">
            <Bath className="h-3 w-3" />
            {listing.bathroomCount}
          </span>
          <PreviewSeparator />
          <span className="flex shrink-0 items-center gap-0.5">
            <Users className="h-3 w-3" />
            {listing.occupancy}
          </span>

          {listing.isCookingAllowed && (
            <>
              <PreviewSeparator />
              <CookingPot className="h-3 w-3 shrink-0" />
            </>
          )}

          {listing.isPetAllowed && (
            <>
              <PreviewSeparator />
              <PawPrint className="h-3 w-3 shrink-0" />
            </>
          )}
        </div>

        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] font-medium leading-4 text-white/88">
          <span className="shrink-0">
            Dep {formatCompactBaht(listing.deposit)}
          </span>
          <PreviewSeparator />
          <span className="shrink-0">
            Move {formatCompactBaht(listing.moveInCost)}
          </span>

          {listing.electricRate != null && (
            <>
              <PreviewSeparator />
              <span className="flex shrink-0 items-center gap-0.5">
                <Zap className="h-3 w-3" />
                {formatRate(listing.electricRate)}
              </span>
            </>
          )}

          {listing.waterRate != null && (
            <>
              <PreviewSeparator />
              <span className="flex min-w-0 items-center gap-0.5 truncate">
                <Droplet className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {formatRate(listing.waterRate)}
                </span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
