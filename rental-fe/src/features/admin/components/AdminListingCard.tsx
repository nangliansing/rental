import {
  Bath,
  Bed,
  Clock3,
  Users,
} from "lucide-react"

import { ListingPhotoCarousel } from "@/features/listing/components/ListingPhotoCarousel"
import type { UploadedMedia } from "@/features/uploads"
import { cn } from "@/lib/utils"
import { ExpandableFormattedText } from "@/shared/components/data-display/ExpandableFormattedText"

import { AdminChipList, AdminStatusChip } from "./AdminChipList"
import { AdminInfoRow } from "./AdminInfoRow"
import { AdminMetric, AdminMiniFact } from "./AdminMetric"

export type AdminListingCardData = {
  _id?: string
  rent: number
  deposit: number
  moveInCost: number
  bedroomCount: number
  bathroomCount: number
  occupancy: number
  contractMonths: number
  kitchenType: string
  size?: number | null
  description?: string | null
  media?: UploadedMedia[]
  visibility?: string
  isDeleted?: boolean
  facilities?: string[]
  isTM30Provided?: boolean
  isForeignerAccepted?: boolean
  isCookingAllowed?: boolean
  isPetAllowed?: boolean
  electricRate?: number | null
  waterRate?: number | null
}

function formatBaht(value: number) {
  return `฿${value.toLocaleString()}`
}

export function AdminListingCard({
  listing,
  imageAlt,
  showImage = false,
  showAdminState = false,
}: {
  listing: AdminListingCardData
  imageAlt?: string
  showImage?: boolean
  showAdminState?: boolean
}) {
  const media = listing.media ?? []

  return (
    <div
      className={cn(
        showImage && "grid gap-4 xl:grid-cols-[220px_1fr]",
      )}
    >
      {showImage && (
        <div
          className="aspect-[4/3] overflow-hidden rounded-lg bg-slate-100"
          aria-label={imageAlt ?? "Listing photos"}
        >
          <ListingPhotoCarousel photos={media} />
        </div>
      )}

      <div className="relative min-w-0">
        <div className="grid gap-3 md:grid-cols-3">
          <AdminMetric label="Rent" value={formatBaht(listing.rent)} />
          <AdminMetric label="Deposit" value={formatBaht(listing.deposit)} />
          <AdminMetric
            label="Move-in"
            value={formatBaht(listing.moveInCost)}
          />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <AdminMiniFact
            icon={<Bed className="h-4 w-4" />}
            value={
              listing.bedroomCount === 0
                ? "Studio"
                : `${listing.bedroomCount} bed`
            }
          />
          <AdminMiniFact
            icon={<Bath className="h-4 w-4" />}
            value={`${listing.bathroomCount} bath`}
          />
          <AdminMiniFact
            icon={<Users className="h-4 w-4" />}
            value={`${listing.occupancy} people`}
          />
          <AdminMiniFact
            icon={<Clock3 className="h-4 w-4" />}
            value={`${listing.contractMonths} months`}
          />
        </div>

        {showAdminState && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {listing.visibility && (
              <AdminInfoRow label="Visibility" value={listing.visibility} />
            )}
            {listing.isDeleted != null && (
              <AdminInfoRow
                label="Deleted"
                value={listing.isDeleted ? "Yes" : "No"}
              />
            )}
            <AdminInfoRow label="Kitchen" value={listing.kitchenType} />
            <AdminInfoRow
              label="Size"
              value={listing.size ? `${listing.size} sqm` : "Not provided"}
            />
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          {listing.isTM30Provided && <AdminStatusChip label="TM30" />}
          {listing.isForeignerAccepted && (
            <AdminStatusChip label="Foreigner accepted" />
          )}
          {listing.isCookingAllowed && <AdminStatusChip label="Cooking" />}
          {listing.isPetAllowed && <AdminStatusChip label="Pet" />}
          <AdminStatusChip label={listing.kitchenType} />
          {listing.electricRate != null && (
            <AdminStatusChip
              label={`Electric ${formatBaht(listing.electricRate)}`}
            />
          )}
          {listing.waterRate != null && (
            <AdminStatusChip label={`Water ${formatBaht(listing.waterRate)}`} />
          )}
        </div>

        <ExpandableFormattedText
          text={listing.description}
          className="mt-4"
          textClassName="text-slate-600"
          collapsedLines={4}
        />

        <AdminChipList
          label="Room facilities"
          values={listing.facilities ?? []}
        />
      </div>
    </div>
  )
}
