import { useCallback, useEffect, useMemo, type ReactNode } from "react"
import { FileQuestion, SearchX } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"

import { useAuth } from "@/features/auth/hooks/useAuth"
import { BuildingFollowersSection } from "@/features/building-follow/components/BuildingFollowersSection"
import {
  NeighbourhoodExploreDialogProvider,
  useNeighbourhoodExploreDialogContext,
} from "@/features/buildings/neighbourhood-explore"
import { ListingGridCard } from "@/features/listing/components/ListingGridCard"
import {
  ListingGridPreviewPortal,
  useListingGridPreview,
} from "@/features/listing/components/grid-preview"
import { getListingDetailPath } from "@/features/listing/utils/listingDisplay"
import { useSearchListingsInBuilding } from "@/features/map-search/api/useSearchListingsInBuilding"
import { CollectionRefreshErrorBanner } from "@/features/map-search/components/results/CollectionRefreshErrorBanner"
import type { MapSearchFilters } from "@/features/map-search/filters/types"
import {
  RESULTS_PANEL_LISTING_GRID_CLASS,
} from "@/features/map-search/utils/building-list-layout"
import { BuildingListingsSectionHeader } from "@/features/map-search/components/results/BuildingListingsSectionHeader"
import { ApiError } from "@/lib/api-client"
import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"
import { ListingCardGrid } from "@/shared/components/collections/ListingCardGrid"
import {
  ListingCollectionMessage,
  ListingCollectionSkeleton,
} from "@/shared/components/collections/ListingCollectionState"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"
import { useNavigateBack } from "@/shared/hooks/useNavigateBack"
import { flattenUniqueInfiniteItems } from "@/shared/utils/infinitePages"

import { useBuildingById, type BuildingDetails } from "../api"
import { BuildingPanelSummarySection } from "../components/BuildingPanelSummarySection"

const EMPTY_BUILDING_LISTING_FILTERS = {} satisfies MapSearchFilters

function normalizeBuildingRouteId(buildingId: unknown) {
  return typeof buildingId === "string" ? buildingId.trim() : ""
}

export function BuildingPage() {
  const { buildingId } = useParams<{ buildingId: string }>()
  const normalizedBuildingId = normalizeBuildingRouteId(buildingId)
  const buildingQuery = useBuildingById({
    buildingId: normalizedBuildingId,
    enabled: normalizedBuildingId.length > 0,
  })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [normalizedBuildingId])

  if (!normalizedBuildingId) {
    return (
      <BuildingPageShell>
        <BuildingNotFound />
      </BuildingPageShell>
    )
  }

  if (buildingQuery.isLoading) {
    return (
      <BuildingPageShell>
        <BuildingPageLoading />
      </BuildingPageShell>
    )
  }

  if (buildingQuery.isError) {
    const isNotFound =
      buildingQuery.error instanceof ApiError &&
      (buildingQuery.error.status === 404 ||
        buildingQuery.error.code === "BUILDING_NOT_FOUND")

    return (
      <BuildingPageShell>
        {isNotFound ? (
          <BuildingNotFound />
        ) : (
          <BuildingPageError onRetry={() => void buildingQuery.refetch()} />
        )}
      </BuildingPageShell>
    )
  }

  if (!buildingQuery.data) {
    return (
      <BuildingPageShell>
        <BuildingNotFound />
      </BuildingPageShell>
    )
  }

  return (
    <BuildingPageShell>
      <NeighbourhoodExploreDialogProvider buildingId={normalizedBuildingId}>
        <BuildingPageContent building={buildingQuery.data} />
      </NeighbourhoodExploreDialogProvider>
    </BuildingPageShell>
  )
}

function BuildingPageContent({ building }: { building: BuildingDetails }) {
  const preview = useListingGridPreview()
  const { user } = useAuth()
  const exploreNeighbourhood = useNeighbourhoodExploreDialogContext()

  const listingsQuery = useSearchListingsInBuilding({
    buildingId: building._id,
    filters: EMPTY_BUILDING_LISTING_FILTERS,
    limit: DEFAULT_LISTING_PAGE_SIZE,
    enabled: Boolean(building._id),
  })

  const listings = useMemo(() => {
    return flattenUniqueInfiniteItems({
      data: listingsQuery.data,
      getItems: (page) => page.data.listings,
      getKey: (listing) => listing._id,
    })
  }, [listingsQuery.data])

  const totalListings = listingsQuery.data?.pages[0]?.pagination.total ?? 0
  const hasListings = listings.length > 0
  const isInitialLoading = listingsQuery.isPending && !hasListings
  const isInitialError = listingsQuery.isError && !hasListings
  const isBackgroundFetching =
    listingsQuery.isFetching &&
    !listingsQuery.isFetchingNextPage &&
    hasListings

  const resolveListingDetailLink = useCallback((listingId: string) => {
    const to = getListingDetailPath(listingId)
    if (!to) return null

    return { to }
  }, [])

  return (
    <>
      <BuildingPanelSummarySection
        building={building}
        breakout="flush"
        titleLevel={1}
        isExploreOpen={exploreNeighbourhood?.isOpen ?? false}
        onExploreNeighbourhood={exploreNeighbourhood?.open}
      />

      <div className="px-4">
        <BuildingFollowersSection
          building={building}
          viewerUserId={user?._id}
          className="mt-4"
        />

        <section aria-label="Available listings">
          <BuildingListingsSectionHeader
            totalListings={totalListings}
            isRefreshing={isBackgroundFetching}
          />

          {listingsQuery.isError && hasListings && (
            <CollectionRefreshErrorBanner
              className="mb-3"
              label="Could not update listings. Showing the previous results."
              onRetry={() => void listingsQuery.refetch()}
            />
          )}

          {isInitialLoading && (
            <ListingCollectionSkeleton
              columns="two"
              count={4}
              className={RESULTS_PANEL_LISTING_GRID_CLASS}
            />
          )}

          {isInitialError && (
            <ListingCollectionMessage
              title="Could not load listings"
              description="Please try again in a moment."
              onRetry={() => void listingsQuery.refetch()}
            />
          )}

          {!isInitialLoading &&
            !isInitialError &&
            listings.length === 0 && (
              <ListingCollectionMessage
                icon={SearchX}
                title="No listings available"
                description="Check back later for new rooms in this building."
              />
            )}

          {hasListings && (
            <ListingCardGrid
              columns="two"
              className={RESULTS_PANEL_LISTING_GRID_CLASS}
              hasNextPage={Boolean(listingsQuery.hasNextPage)}
              isFetchingNextPage={listingsQuery.isFetchingNextPage}
              isFetchNextPageError={listingsQuery.isFetchNextPageError}
              onFetchNextPage={() => void listingsQuery.fetchNextPage()}
              endMessage="No more listings"
              testId="building-listing-grid"
            >
              {listings.map((listing) => (
                <ListingGridCard
                  key={listing._id}
                  listing={listing}
                  showBuildingName={false}
                  onActivate={(item) => preview.openPreview(item)}
                />
              ))}
            </ListingCardGrid>
          )}
        </section>
      </div>

      <ListingGridPreviewPortal
        preview={preview}
        showBuildingName={false}
        detailMode="link"
        resolveDetailLink={resolveListingDetailLink}
      />
    </>
  )
}

function BuildingPageShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-white pb-10 text-slate-950">
      <div className="mx-auto max-w-2xl">{children}</div>
    </main>
  )
}

function BuildingPageLoading() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center gap-2 px-4 text-sm font-medium text-slate-500">
      <LoaderIcon className="h-4 w-4" />
      Loading building...
    </div>
  )
}

function BuildingNotFound() {
  const navigate = useNavigate()
  const navigateBack = useNavigateBack("/")

  return (
    <div className="flex min-h-[58vh] flex-col items-center justify-center px-6 text-center">
      <FileQuestion className="h-14 w-14 text-slate-400" />

      <h1 className="mt-5 text-2xl font-semibold text-slate-950">
        Building not found
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        This building may be inactive, removed, or no longer available to view.
      </p>

      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          className="inline-flex h-10 min-w-32 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
          onClick={() => navigate("/")}
        >
          Browse listings
        </button>
        <button
          type="button"
          className="inline-flex h-10 min-w-24 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-950"
          onClick={navigateBack}
        >
          Go back
        </button>
      </div>
    </div>
  )
}

function BuildingPageError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[58vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold text-slate-950">
        Could not load building
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        Please try again in a moment.
      </p>

      <button
        type="button"
        className="mt-7 inline-flex h-10 min-w-32 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
        onClick={onRetry}
      >
        Try again
      </button>
    </div>
  )
}
