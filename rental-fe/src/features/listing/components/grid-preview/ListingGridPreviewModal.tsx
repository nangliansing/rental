import { Link } from "react-router-dom"
import type { ReactNode, RefObject } from "react"

import { ModalPortal } from "@/shared/components/ModalPortal"
import { useAccessibleModal } from "@/shared/hooks/useAccessibleModal"

import type { ListingGridCardListing } from "../listingGridCardTypes"
import { ListingCoverImage } from "../ListingPresentationPrimitives"
import { ListingAvailabilityDisplay } from "../ListingAvailabilityDisplay"
import { formatCompactMoney, getSortedListingPhotos } from "../../utils/listingDisplay"
import { LISTING_GRID_CARD_AVAILABILITY_VARIANT } from "../../utils/listingGridAvailabilityVariant"
import { ListingGridCardOverlayContent } from "./ListingGridCardOverlayContent"
import { ListingGridCardBadge } from "./listingGridCardChrome"
import {
  isListingGridPreviewLinkDetailMode,
  isListingGridPreviewModalDetailMode,
  readListingGridPreviewListingId,
  type ListingGridPreviewDetailMode,
} from "./listingGridPreviewDetailMode"

export type { ListingGridPreviewDetailLink } from "./listingGridPreviewDetailMode"

type ListingGridPreviewModalProps = {
  listing: ListingGridCardListing | null
  onClose: () => void
  detailMode: ListingGridPreviewDetailMode
  showBuildingName?: boolean
  skipHistorySyncOnCloseRef?: RefObject<boolean>
}

const PREVIEW_CARD_CLASS_NAME =
  "group relative block aspect-square w-full overflow-hidden text-left"

export function ListingGridPreviewModal({
  listing,
  onClose,
  detailMode,
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
  const listingId = readListingGridPreviewListingId(listing)
  const detailLabel = `${previewLabel}. Tap for full details.`

  const previewCardContent = (
    <>
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
    </>
  )

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
          <ListingGridPreviewDetailActivator
            detailMode={detailMode}
            listingId={listingId}
            detailLabel={detailLabel}
          >
            {previewCardContent}
          </ListingGridPreviewDetailActivator>
        </div>
      </div>
    </ModalPortal>
  )
}

type ListingGridPreviewDetailActivatorProps = {
  detailMode: ListingGridPreviewDetailMode
  listingId: string
  detailLabel: string
  children: ReactNode
}

function ListingGridPreviewDetailActivator({
  detailMode,
  listingId,
  detailLabel,
  children,
}: ListingGridPreviewDetailActivatorProps) {
  if (isListingGridPreviewLinkDetailMode(detailMode)) {
    return (
      <Link
        to={detailMode.link.to}
        state={detailMode.link.state}
        className={PREVIEW_CARD_CLASS_NAME}
        aria-label={detailLabel}
        onClick={() => detailMode.onLinkActivate?.()}
      >
        {children}
      </Link>
    )
  }

  if (!isListingGridPreviewModalDetailMode(detailMode)) {
    return null
  }

  const openDetailModal = () => {
    if (!listingId) return
    detailMode.onOpenDetail(listingId)
  }

  return (
    <button
      type="button"
      className={PREVIEW_CARD_CLASS_NAME}
      aria-label={detailLabel}
      onClick={openDetailModal}
    >
      {children}
    </button>
  )
}
