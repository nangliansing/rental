import { ModalPortal } from "@/shared/components/ModalPortal"
import { useAccessibleModal } from "@/shared/hooks/useAccessibleModal"

import type { ListingGridCardListing } from "../listingGridCardTypes"
import { ListingCoverImage } from "../ListingPresentationPrimitives"
import { formatCompactMoney, getSortedListingPhotos } from "../../utils/listingDisplay"
import { ListingGridCardOverlayContent } from "./ListingGridCardOverlayContent"
import {
  ListingGridCardAvailabilityBadge,
  ListingGridCardBadge,
} from "./listingGridCardChrome"

export type ListingGridPreviewModalProps = {
  listing: ListingGridCardListing | null
  onClose: () => void
  onOpenDetail: (listingId: string) => void
  showBuildingName?: boolean
}

export function ListingGridPreviewModal({
  listing,
  onClose,
  onOpenDetail,
  showBuildingName = true,
}: ListingGridPreviewModalProps) {
  const isOpen = listing != null
  const { containerRef, onBackdropClick } = useAccessibleModal<HTMLDivElement>({
    isOpen,
    onClose,
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
            <ListingGridCardAvailabilityBadge listing={listing} />
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
