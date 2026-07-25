import { useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import { useAuth } from "@/features/auth/hooks/useAuth"
import { ContactActions } from "@/features/contacts/components/ContactActions"
import type { DirectionsDestination } from "@/features/contacts/utils/buildGoogleMapsDirectionsUrl"
import { toContactValues } from "@/features/contacts/utils/toContactValues"
import type { SearchListing } from "@/features/map-search/types"
import { SaveListingButton } from "@/features/saved-listing/components/SaveListingButton"
import { useOptimisticSavedListingToggle } from "@/features/saved-listing/hooks/useOptimisticSavedListingToggle"

import type { ListingVisibility } from "../types"
import { buildListingUrl } from "../utils/listingDisplay"
import { ListingPostBody } from "./ListingPostBody"
import {
  ListingPostCardDialogHost,
  type ListingPostCardDialogActions,
} from "./ListingPostCardDialogHost"
import { ListingPostHeader } from "./ListingPostHeader"

type ListingPostCardProps = {
  listing: SearchListing
  currentUserId?: string
  canCreateListing?: boolean
  directionsDestination?: DirectionsDestination | null
  onDeleted?: (listing: SearchListing) => void
}

export function ListingPostCard({
  listing,
  currentUserId,
  canCreateListing = false,
  directionsDestination,
  onDeleted,
}: ListingPostCardProps) {
  const dialogActionsRef = useRef<ListingPostCardDialogActions>(null)
  const [isDeletedLocally, setIsDeletedLocally] = useState(false)
  const [visibilityOverride, setVisibilityOverride] = useState<ListingVisibility | null>(
    null,
  )

  if (isDeletedLocally) return null

  return (
    <>
      <ListingPostCardArticle
        listing={listing}
        currentUserId={currentUserId}
        canCreateListing={canCreateListing}
        directionsDestination={directionsDestination}
        currentVisibility={visibilityOverride ?? listing.visibility}
        dialogActionsRef={dialogActionsRef}
      />

      <ListingPostCardDialogHost
        ref={dialogActionsRef}
        listing={listing}
        currentVisibility={visibilityOverride ?? listing.visibility}
        onDeleteStarted={() => setIsDeletedLocally(true)}
        onDeleteFailed={() => setIsDeletedLocally(false)}
        onDeleted={(deletedListing) => {
          onDeleted?.(deletedListing)
        }}
        onVisibilityUpdated={setVisibilityOverride}
      />
    </>
  )
}

type ListingPostCardArticleProps = {
  listing: SearchListing
  currentUserId?: string
  canCreateListing: boolean
  directionsDestination?: DirectionsDestination | null
  currentVisibility: ListingVisibility
  dialogActionsRef: React.RefObject<ListingPostCardDialogActions | null>
}

function ListingPostCardArticle({
  listing,
  currentUserId,
  canCreateListing,
  directionsDestination,
  currentVisibility,
  dialogActionsRef,
}: ListingPostCardArticleProps) {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [saveAnimationKey, setSaveAnimationKey] = useState(0)
  const savedListingToggle = useOptimisticSavedListingToggle({
    listingId: listing._id,
    initialIsSaved: Boolean(listing.isSavedByMe),
  })

  const agent = listing.agentProfile
  const isOwnListing =
    typeof currentUserId === "string" && listing.listedBy === currentUserId
  const hasActiveAccount = isAuthenticated && user?.status === "ACTIVE"
  const isSavedByMe = savedListingToggle.isSaved
  const listingUrl = buildListingUrl(listing._id)
  const editHref = `/listings/${listing._id}/edit`
  const listInBuildingHref = listing.buildingId
    ? `/listings/new?buildingId=${encodeURIComponent(listing.buildingId)}`
    : undefined
  const profileHref = isOwnListing
    ? "/profile"
    : agent
      ? `/listers/${agent._id}`
      : undefined
  const contactMessage = listingUrl
    ? `Hi, I'm interested in this room: ${listingUrl}`
    : undefined

  const openDialog = (action: keyof ListingPostCardDialogActions) => {
    dialogActionsRef.current?.[action]()
  }

  const handleSaveToggle = () => {
    if (!isAuthenticated) {
      const redirect = location.pathname + location.search
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`)
      return
    }

    if (!hasActiveAccount) return

    setSaveAnimationKey((current) => current + 1)
    savedListingToggle.toggle()
  }

  const saveButton = (
    <SaveListingButton
      isSaved={isSavedByMe}
      isPending={savedListingToggle.isSyncing}
      isDisabled={isAuthenticated && !hasActiveAccount}
      shouldAnimate={saveAnimationKey > 0}
      animationKey={saveAnimationKey}
      onClick={handleSaveToggle}
    />
  )

  return (
    <article className="overflow-hidden border-b border-slate-100 bg-white pb-3 last:border-b-0">
      <ListingPostHeader
        agent={agent}
        updatedAt={listing.updatedAt}
        isPrivate={currentVisibility === "PRIVATE"}
        isOwnListing={isOwnListing}
        canCreateListing={canCreateListing}
        canReportListing={hasActiveAccount}
        listingUrl={listingUrl}
        profileHref={profileHref}
        editHref={editHref}
        listInBuildingHref={listInBuildingHref}
        onReviewsRequest={
          agent ? () => openDialog("openReviewsDialog") : undefined
        }
        onPrivacyRequest={() => openDialog("openPrivacyDialog")}
        onDeleteRequest={() => openDialog("openDeleteDialog")}
        onReportRequest={() => openDialog("openReportDialog")}
      />

      <ListingPostBody
        listing={listing}
        onReviewsRequest={
          agent ? () => openDialog("openReviewsDialog") : undefined
        }
      />

      <ContactActions
        contactOwnerName={agent?.displayName ?? "Lister"}
        contacts={toContactValues(agent)}
        context={
          agent
            ? {
                type: "listing",
                url: listingUrl,
                message: contactMessage,
              }
            : undefined
        }
        directionsDestination={directionsDestination}
        leadingAction={saveButton}
        className="mt-2 px-3"
      />
    </article>
  )
}
