import {
  CookingPot,
  Droplet,
  PawPrint,
  Zap,
} from "lucide-react"

import {
  ListingPrice,
  ListingRoomSummary,
} from "../ListingPresentationPrimitives"
import {
  ListingGridCardFinePrint,
  ListingGridCardMetaText,
  ListingGridCardOverlay,
  ListingGridCardPriceText,
  ListingGridCardTitleText,
} from "../ListingGridCardPrimitives"
import type { ListingGridCardListing } from "../listingGridCardTypes"
import {
  formatCompactMoney,
  formatRate,
} from "../../utils/listingDisplay"
import { getListingAvailabilityLabel } from "../../utils/listingAvailability"
import { ListingGridCardAgentAttribution } from "./ListingGridCardAgentAttribution"

export type ListingGridCardOverlayContentProps = {
  listing: ListingGridCardListing
  showBuildingName?: boolean
  showFinePrint?: boolean
  showAvailabilityInFinePrint?: boolean
  showAgentAttribution?: boolean
}

export function ListingGridCardOverlayContent({
  listing,
  showBuildingName = true,
  showFinePrint = false,
  showAvailabilityInFinePrint = true,
  showAgentAttribution = false,
}: ListingGridCardOverlayContentProps) {
  const buildingName = listing.building?.name?.trim()
  const availabilityLabel =
    showFinePrint && showAvailabilityInFinePrint
      ? getListingAvailabilityLabel(listing.availableAt)
      : null

  return (
    <ListingGridCardOverlay>
      <ListingGridCardPriceText>
        <ListingPrice value={listing.rent} />
      </ListingGridCardPriceText>
      {showBuildingName && buildingName && (
        <ListingGridCardTitleText>{buildingName}</ListingGridCardTitleText>
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
          <PawPrint className="h-3 w-3 shrink-0" aria-label="Pets allowed" />
        )}
      </ListingGridCardMetaText>
      {showFinePrint && (
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
          {availabilityLabel && (
            <span className="truncate">{availabilityLabel}</span>
          )}
        </ListingGridCardFinePrint>
      )}
      {showAgentAttribution && (
        <ListingGridCardAgentAttribution agent={listing.agentProfile} />
      )}
    </ListingGridCardOverlay>
  )
}
