import {
  Bath,
  Bed,
  CalendarDays,
  CookingPot,
  Droplet,
  PawPrint,
  Users,
  Zap,
} from "lucide-react"
import { useMemo } from "react"
import type { ReactNode } from "react"

import type { SearchListing } from "@/features/map-search/types"
import { ExpandableFormattedText } from "@/shared/components/data-display/ExpandableFormattedText"
import { ReviewTagBadges } from "@/shared/components/data-display/ReviewTagBadges"

import { ListingPhotoCarousel } from "./ListingPhotoCarousel"
import { MonthlyCostAdvice } from "./MonthlyCostAdvice"
import {
  formatBathroom,
  formatBedroom,
  formatCompactMoney,
  formatContract,
  formatRate,
  getSortedListingPhotos,
} from "../utils/listingDisplay"

type ListingPostBodyProps = {
  listing: SearchListing
  onReviewsRequest?: () => void
}

function InlineDot() {
  return <span className="text-slate-300">·</span>
}

function DetailChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: "neutral" | "blue"
}) {
  return (
    <span
      className={
        tone === "blue"
          ? "inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700"
          : "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
      }
    >
      {children}
    </span>
  )
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeFacilities(value: unknown) {
  if (!Array.isArray(value)) return []

  return value.flatMap((facility) => {
    const normalizedFacility = normalizeText(facility)
    return normalizedFacility ? [normalizedFacility] : []
  })
}

function normalizeOccupancy(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null
}

export function ListingPostBody({
  listing,
  onReviewsRequest,
}: ListingPostBodyProps) {
  const photos = useMemo(
    () => getSortedListingPhotos(listing.media),
    [listing.media],
  )
  const description = listing.description
  const facilities = normalizeFacilities(listing.facilities)
  const occupancy = normalizeOccupancy(listing.occupancy)
  const kitchenType = normalizeText(listing.kitchenType)
  const agent = listing.agentProfile

  return (
    <>
      <ExpandableFormattedText
        text={description}
        className="px-3 pb-2"
        textClassName="leading-5"
      />

      <div className="relative">
        <ListingPhotoCarousel photos={photos} />
        <ReviewTagBadges
          tagCounts={agent?.reviewSummary?.tagCounts}
          maxTags={2}
          onReviewsClick={agent ? onReviewsRequest : undefined}
          className="absolute bottom-3 left-3 z-10 max-w-[calc(100%-1.5rem)]"
        />
      </div>

      <section className="space-y-2 px-3 pt-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm font-medium leading-5 text-slate-500">
          <span className="text-base font-semibold text-slate-950">
            {formatCompactMoney(listing.rent)}
          </span>
          <InlineDot />
          <span>Dep {formatCompactMoney(listing.deposit)}</span>
          <InlineDot />
          <span>Move {formatCompactMoney(listing.moveInCost)}</span>

          {listing.electricRate != null && (
            <>
              <InlineDot />
              <span className="inline-flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" />
                {formatRate(listing.electricRate)}
              </span>
            </>
          )}

          {listing.waterRate != null && (
            <>
              <InlineDot />
              <span className="inline-flex items-center gap-1">
                <Droplet className="h-3.5 w-3.5" />
                {formatRate(listing.waterRate)}
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <DetailChip>
            {listing.bedroomCount === 0 ? (
              formatBedroom(listing.bedroomCount)
            ) : (
              <>
                <Bed className="h-3.5 w-3.5" />
                {formatBedroom(listing.bedroomCount)}
              </>
            )}
          </DetailChip>

          <DetailChip>
            <Bath className="h-3.5 w-3.5" />
            {formatBathroom(listing.bathroomCount)}
          </DetailChip>

          {occupancy !== null && (
            <DetailChip>
              <Users className="h-3.5 w-3.5" />
              {occupancy} {occupancy === 1 ? "person" : "people"}
            </DetailChip>
          )}

          <DetailChip>
            <CalendarDays className="h-3.5 w-3.5" />
            {formatContract(listing.contractMonths)}
          </DetailChip>

          {kitchenType && <DetailChip>{kitchenType}</DetailChip>}
        </div>

        {(listing.isCookingAllowed ||
          listing.isPetAllowed ||
          listing.isTM30Provided ||
          listing.isForeignerAccepted) && (
          <div className="flex flex-wrap gap-1.5">
            {listing.isCookingAllowed && (
              <DetailChip>
                <CookingPot className="h-3.5 w-3.5" />
                Cooking
              </DetailChip>
            )}

            {listing.isPetAllowed && (
              <DetailChip>
                <PawPrint className="h-3.5 w-3.5" />
                Pet
              </DetailChip>
            )}

            {listing.isTM30Provided && (
              <DetailChip tone="blue">TM30</DetailChip>
            )}

            {listing.isForeignerAccepted && (
              <DetailChip>Foreigner accepted</DetailChip>
            )}
          </div>
        )}

        {facilities.length > 0 && (
          <p className="text-xs leading-5 text-slate-400">
            {facilities.join(" · ")}
          </p>
        )}
      </section>

      <MonthlyCostAdvice
        rent={listing.rent}
        electricRate={listing.electricRate}
        waterRate={listing.waterRate}
        className="mt-1 px-3"
      />
    </>
  )
}
