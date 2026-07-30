import { ModalPortal } from "@/shared/components/ModalPortal"
import { useAccessibleModal } from "@/shared/hooks/useAccessibleModal"
import type { RefObject } from "react"

import type { ListingGridCardListing } from "../listingGridCardTypes"
import { ListingCoverImage } from "../ListingPresentationPrimitives"
import { ListingAvailabilityDisplay } from "../ListingAvailabilityDisplay"
import { formatCompactMoney, getSortedListingPhotos } from "../../utils/listingDisplay"
import { LISTING_GRID_CARD_AVAILABILITY_VARIANT } from "../../utils/listingGridAvailabilityVariant"
import { ListingGridCardOverlayContent } from "./ListingGridCardOverlayContent"
import {
  ListingGridCardBadge,
} from "./listingGridCardChrome"

export type ListingGridPreviewModalProps = {
  listing: ListingGridCardListing | null
  onClose: () => void
  onOpenDetail: (listingId: string) => void
  showBuildingName?: boolean
  skipHistorySyncOnCloseRef?: RefObject<boolean>
}

export function ListingGridPreviewModal({
  listing,
  onClose,
  onOpenDetail,
  showBuildingName = true,
  skipHistorySyncOnCloseRef,
}: ListingGridPreviewModalProps) {
  const isOpen = listing != null
  const { containerRef, onBackdropClick } = useAccessibleModal<HTMLDivElement>({
    isOpen,
    onClose,
    skipHistorySyncRef: skipHistorySyncOnCloseRef,
  })

  if (!listing) return null

  const [coverPhoto] = getSortedListingPhotos(listing.media)
  const previewLabel = `Preview listing ${formatCompactMoney(listing.rent)}`
  const listingId = typeof listing._id === "string" ? listing._id.trim() : ""

  const openDetail = () => {
    if (!listingId) return
    onOpenDetail(listingId)
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4"
        onClick={onBackdropClick}
      >
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-label={previewLabel}
          className="relative w-full max-w-sm overflow-hidden rounded-xl bg-slate-950 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="group relative block aspect-square w-full overflow-hidden text-left"
            aria-label={`${previewLabel}. Tap for full details.`}
            onClick={openDetail}
          >
            <ListingCoverImage
              photo={coverPhoto}
              className="transition duration-200 group-hover:scale-[1.02]"
              fallbackClassName="text-slate-300"
              loading="eager"
              fetchPriority="high"
            />
            <ListingAvailabilityDisplay
              availableAt={listing.availableAt}
              variant={LISTING_GRID_CARD_AVAILABILITY_VARIANT}
            />
            <ListingGridCardBadge listing={listing} />
            <ListingGridCardOverlayContent
              listing={listing}
              showBuildingName={showBuildingName}
              showFinePrint
              showAvailabilityInFinePrint={false}
              showAgentAttribution={!showBuildingName}
            />
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}
