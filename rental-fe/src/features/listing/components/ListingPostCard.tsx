import { useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"

import {
  BuildingNeighbourhoodExploreModal,
  ExploreNeighbourhoodButton,
  useNeighbourhoodExploreDialog,
  useNeighbourhoodExploreDialogContext,
  type NeighbourhoodExploreDialogControl,
} from "@/features/buildings/neighbourhood-explore"
import { useAuth } from "@/features/auth/hooks/useAuth"
import { ContactActions } from "@/features/contacts/components/ContactActions"
import type { DirectionsDestination } from "@/features/contacts/utils/buildGoogleMapsDirectionsUrl"
import { toContactValues } from "@/features/contacts/utils/toContactValues"
import type { SearchListing } from "@/features/map-search/types"
import { SaveListingButton } from "@/features/saved-listing/components/SaveListingButton"
import { useOptimisticSavedListingToggle } from "@/features/saved-listing/hooks/useOptimisticSavedListingToggle"

import type { ListingVisibility } from "../types"
import { useUpdateOwnerListing } from "../api"
import {
  toListingAvailabilityDateKey,
} from "../utils/listingAvailability"
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
  const [availableAtOverride, setAvailableAtOverride] = useState<
    string | null | undefined
  >(undefined)
  const sharedExploreNeighbourhood = useNeighbourhoodExploreDialogContext()
  const currentAvailableAt =
    availableAtOverride !== undefined
      ? availableAtOverride
      : listing.availableAt

  if (isDeletedLocally) return null

  return (
    <>
      {sharedExploreNeighbourhood ? (
        <ListingPostCardArticle
          listing={listing}
          currentUserId={currentUserId}
          canCreateListing={canCreateListing}
          directionsDestination={directionsDestination}
          currentVisibility={visibilityOverride ?? listing.visibility}
          currentAvailableAt={currentAvailableAt}
          onAvailableAtUpdated={setAvailableAtOverride}
          dialogActionsRef={dialogActionsRef}
          exploreNeighbourhood={sharedExploreNeighbourhood}
        />
      ) : (
        <ListingPostCardArticleWithLocalExplore
          listing={listing}
          currentUserId={currentUserId}
          canCreateListing={canCreateListing}
          directionsDestination={directionsDestination}
          currentVisibility={visibilityOverride ?? listing.visibility}
          currentAvailableAt={currentAvailableAt}
          onAvailableAtUpdated={setAvailableAtOverride}
          dialogActionsRef={dialogActionsRef}
        />
      )}

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
  currentAvailableAt: string | null
  onAvailableAtUpdated: (availableAt: string | null) => void
  dialogActionsRef: React.RefObject<ListingPostCardDialogActions | null>
  exploreNeighbourhood: NeighbourhoodExploreDialogControl
}

function ListingPostCardArticleWithLocalExplore(
  props: Omit<ListingPostCardArticleProps, "exploreNeighbourhood">,
) {
  const exploreNeighbourhood = useNeighbourhoodExploreDialog()

  return (
    <>
      <ListingPostCardArticle
        {...props}
        exploreNeighbourhood={exploreNeighbourhood}
      />

      <BuildingNeighbourhoodExploreModal
        buildingId={props.listing.buildingId}
        isOpen={exploreNeighbourhood.isOpen}
        onClose={exploreNeighbourhood.close}
        trackBrowserHistory={false}
      />
    </>
  )
}

function ListingPostCardArticle({
  listing,
  currentUserId,
  canCreateListing,
  directionsDestination,
  currentVisibility,
  currentAvailableAt,
  onAvailableAtUpdated,
  dialogActionsRef,
  exploreNeighbourhood,
}: ListingPostCardArticleProps) {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [saveAnimationKey, setSaveAnimationKey] = useState(0)
  const [availabilityError, setAvailabilityError] = useState("")
  const updateListingMutation = useUpdateOwnerListing()
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

  const handleAvailableAtChange = (nextAvailableAt: string | null) => {
    if (
      toListingAvailabilityDateKey(currentAvailableAt) === nextAvailableAt ||
      updateListingMutation.isPending
    ) {
      return
    }

    setAvailabilityError("")
    updateListingMutation.mutate(
      { listingId: listing._id, values: { availableAt: nextAvailableAt } },
      {
        onSuccess: (updatedListing) => {
          onAvailableAtUpdated(updatedListing.availableAt)
          setAvailabilityError("")
        },
        onError: (error) => {
          setAvailabilityError(
            error instanceof Error
              ? error.message
              : "Could not update listing availability. Try again.",
          )
        },
      },
    )
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
        availableAt={currentAvailableAt}
        isOwnListing={isOwnListing}
        isAvailabilitySubmitting={updateListingMutation.isPending}
        availabilityError={availabilityError || null}
        onAvailableAtChange={handleAvailableAtChange}
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
        trailingAction={
          <ExploreNeighbourhoodButton
            variant="footer"
            isOpen={exploreNeighbourhood.isOpen}
            onClick={exploreNeighbourhood.open}
          />
        }
        className="mt-2 px-3"
      />
    </article>
  )
}
