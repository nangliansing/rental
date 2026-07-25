import {
  CalendarClock,
  ImageIcon,
} from "lucide-react"

import type { PendingPost } from "@/features/pending-post"
import {
  formatBedroom,
  formatCompactMoney,
  formatContract,
  getSortedListingPhotos,
} from "@/features/listing/utils/listingDisplay"
import {
  ListingGridCardFinePrint,
  ListingGridCardMetaText,
  ListingGridCardOverlay,
  ListingGridCardPriceText,
  ListingGridCardTitleText,
  listingGridCardBadgeClassName,
  listingGridCardSurfaceClassName,
} from "@/features/listing/components/ListingGridCardPrimitives"
import { cn } from "@/lib/utils"
import { OptimizedImage } from "@/shared/components/media/OptimizedImage"

import {
  formatPendingPostSubmittedAt,
  getPendingPostBuildingName,
  getPendingPostStatusStyle,
  getPendingPostSubmissionType,
} from "../utils/pendingPostDisplayUtils"

type MyProfilePendingCardProps = {
  post: PendingPost
  onOpen: () => void
}

export function MyProfilePendingCard({ post, onOpen }: MyProfilePendingCardProps) {
  const [coverPhoto] = getSortedListingPhotos(post.listing?.media ?? [])
  const status = getPendingPostStatusStyle(post.status)
  const StatusIcon = status.icon
  const buildingName = getPendingPostBuildingName(post)
  const submittedAt = formatPendingPostSubmittedAt(post.createdAt)
  const listing = post.listing

  return (
    <button
      type="button"
      className={listingGridCardSurfaceClassName}
      aria-label={`Open ${status.label.toLowerCase()} submission ${buildingName}`}
      onClick={onOpen}
    >
      {coverPhoto ? (
        <OptimizedImage
          src={coverPhoto.secureUrl}
          alt={coverPhoto.alt ?? buildingName}
          className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
          width={640}
          height={640}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          loading="lazy"
          fallback={
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon aria-hidden="true" className="h-8 w-8 text-slate-300" />
              <span className="sr-only">Photo unavailable</span>
            </div>
          }
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ImageIcon className="h-8 w-8 text-slate-300" />
        </div>
      )}

      <span
        className={cn(
          "absolute left-2 top-2 max-w-[calc(100%-4.25rem)] gap-1 ring-1",
          listingGridCardBadgeClassName,
          status.className,
        )}
      >
        <StatusIcon className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{status.label}</span>
      </span>

      <span
        className={cn(
          "absolute right-2 top-2 bg-slate-950/55 text-white",
          listingGridCardBadgeClassName,
        )}
      >
        {formatContract(listing?.contractMonths ?? 0)}
      </span>

      <ListingGridCardOverlay>
        <ListingGridCardPriceText>
          {formatCompactMoney(listing?.rent ?? 0)}
        </ListingGridCardPriceText>
        <ListingGridCardTitleText>{buildingName}</ListingGridCardTitleText>
        <ListingGridCardMetaText>
          <span className="truncate">
            {getPendingPostSubmissionType(post)} ·{" "}
            {formatBedroom(listing?.bedroomCount ?? 0)}
            {listing?.size ? ` · ${listing.size} sqm` : ""}
          </span>
        </ListingGridCardMetaText>
        <ListingGridCardFinePrint>
          <CalendarClock className="h-3 w-3 shrink-0" />
          <span className="truncate">{submittedAt}</span>
        </ListingGridCardFinePrint>

        {post.reviewNote && (
          <p className="mt-1 line-clamp-1 text-[11px] font-medium leading-4 text-white/75">
            {post.reviewNote}
          </p>
        )}
      </ListingGridCardOverlay>
    </button>
  )
}
