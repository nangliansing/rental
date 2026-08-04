import { useEffect, useRef, useState } from "react"
import type React from "react"
import { ChevronLeft, X } from "lucide-react"

import type { SearchAgentProfile } from "@/features/agent"
import { useMediaQuery } from "@/hooks/useMediaQuery"
import { cn } from "@/lib/utils"
import {
  DraggableBottomDrawer,
  DraggableBottomDrawerDragRegion,
  preventDraggableBottomDrawerPropagation,
  type DraggableBottomDrawerDragHandleProps,
  type DraggableBottomDrawerSnap,
} from "@/shared/components/navigation/DraggableBottomDrawer"
import { useBrowserBackDismiss } from "@/shared/hooks/useBrowserBackDismiss"
import { useMapSearchFilters } from "../../context/MapSearchFilterContext"
import {
  useMapSearchResults,
  type MapSearchSource,
  type MapSearchStatus,
} from "../../context/MapSearchSessionContext"
import type { SearchBuilding } from "../../types"
import { FilterBar } from "../filters/FilterBar"
import { FilterConfigPage } from "../filters/FilterConfigPage"
import { BuildingDetailSessionProvider } from "../../context/BuildingDetailSessionContext"
import { BuildingDetailPage } from "./BuildingDetailPage"
import { BuildingListPage } from "./BuildingListPage"
import { SearchStateMessage } from "./SearchStateMessage"
import { SelectedListerRail } from "./SelectedListerRail"
import { useResultsPanelFocus } from "../../hooks/useResultsPanelFocus"
import { formatBuildingResultsTitle } from "../../utils/map-search-presentation"
import { RESULTS_PANEL_CONTENT_INSET_CLASS } from "../../utils/building-list-layout"
import { MapSearchResultsAnnouncement } from "./MapSearchResultsAnnouncement"

type PanelSnap = DraggableBottomDrawerSnap
type PanelPage = "results" | "buildingDetail" | "filters"

type PanelHeaderProps = {
  title: string
  canGoBack: boolean
  selectedListers: SearchAgentProfile[]
  onBack: () => void
  onRemoveLister: (listerId: string) => void
  onHeaderButtonPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void
} & DraggableBottomDrawerDragHandleProps

type ListingIntentNoticeProps = {
  onExit: () => void
}

type NewBuildingActionCardProps = {
  isListingSearch: boolean
  onListNewBuilding: () => void
}

function getPanelTitle({
  activePage,
  selectedBuilding,
  searchStatus,
  searchSource,
  buildingsCount,
  isListingSearch,
}: {
  activePage: PanelPage
  selectedBuilding: SearchBuilding | null
  searchStatus: MapSearchStatus
  searchSource: MapSearchSource
  buildingsCount: number
  isListingSearch: boolean
}) {
  if (activePage === "filters") return "Filters"
  if (selectedBuilding) return selectedBuilding.name
  if (searchStatus === "loading") return "Searching..."
  if (searchStatus === "stale") return "Filters changed"
  if (searchStatus === "empty") {
    return isListingSearch ? "No buildings yet" : "No buildings found"
  }
  if (searchStatus === "error") return "Search failed"

  return formatBuildingResultsTitle(buildingsCount, searchSource)
}

function ListingIntentNotice({ onExit }: ListingIntentNoticeProps) {
  return (
    <div className="mb-3 px-4 lg:mt-4">
      <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-950">
            Listing a room
          </p>
          <p className="mt-0.5 text-xs leading-5 text-slate-600">
            Choose a building to list under, or drop a pin to add a new one.
          </p>
        </div>

        <button
          type="button"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-white/80 hover:text-slate-950"
          aria-label="Exit listing search"
          onClick={onExit}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

function NewBuildingActionCard({
  isListingSearch,
  onListNewBuilding,
}: NewBuildingActionCardProps) {
  return (
    <div
      className={cn(
        "mb-3 rounded-lg border p-3",
        isListingSearch
          ? "border-slate-200 bg-white"
          : "border-blue-100 bg-blue-50",
      )}
    >
      <p className="text-sm font-semibold text-slate-950">
        {isListingSearch ? "Need a new building?" : "Can't find the building?"}
      </p>
      <p className="mt-1 text-sm leading-5 text-slate-600">
        Use the pinned location to add the building and list a room.
      </p>
      <button
        type="button"
        className="mt-3 flex h-10 w-full items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
        onClick={onListNewBuilding}
      >
        Add building and list
      </button>
    </div>
  )
}

function MobilePanelHeader({
  title,
  canGoBack,
  selectedListers,
  onBack,
  onRemoveLister,
  onHeaderButtonPointerDown,
  ...dragHandle
}: PanelHeaderProps) {
  return (
    <DraggableBottomDrawerDragRegion
      dragHandle={dragHandle}
      className="px-4 pb-3 pt-4"
    >
      <div className="flex min-w-0 items-center gap-2">
        {canGoBack && (
          <button
            type="button"
            className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-950 hover:bg-slate-100"
            aria-label="Go back"
            onPointerDown={onHeaderButtonPointerDown}
            onClick={onBack}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        <p className="shrink-0 text-sm font-semibold">{title}</p>
        {!canGoBack && (
          <SelectedListerRail
            listers={selectedListers}
            onRemove={onRemoveLister}
          />
        )}
      </div>
    </DraggableBottomDrawerDragRegion>
  )
}

export function BuildingResultsPanel() {
  const { selectedListers, removeLister } = useMapSearchFilters()
  const {
    searchStatus,
    buildings,
    selectedBuilding,
    selectedPin,
    searchSource,
    isListingSearch,
    canCreateListing,
    isPendingBuildingUnresolved,
    onSearchAgain,
    onExitListingSearch,
    onBuildingSelect,
    onBuildingHoverChange,
    onListNewBuilding,
  } = useMapSearchResults()
  const [snap, setSnap] = useState<PanelSnap>("half")
  const [page, setPage] = useState<PanelPage>("results")
  const [returnPage, setReturnPage] = useState<PanelPage>("results")
  const mobileScrollRootRef = useRef<HTMLDivElement | null>(null)
  const desktopScrollRootRef = useRef<HTMLDivElement | null>(null)
  const isDesktop = useMediaQuery("(min-width: 1024px)")

  // Keep the last successful collection visible while the map is stale, a
  // replacement request is pending, or a refresh fails.
  const hasResults = buildings.length > 0
  const activePage = page

  useEffect(() => {
    if (!selectedBuilding) return
    setPage((current) => (current === "results" ? "buildingDetail" : current))
    setSnap("full")
  }, [selectedBuilding])
  const {
    mobilePageHeadingRef,
    desktopPageHeadingRef,
    mobileFilterTriggerRef,
    desktopFilterTriggerRef,
    captureReturnFocus,
    focusPage,
    restoreFocus,
  } = useResultsPanelFocus({ activePage, isDesktop })

  const closeFiltersRef = useRef<() => void>(() => {})
  closeFiltersRef.current = () => {
    restoreFocus()
    setPage(returnPage)
  }

  const dismissFilters = useBrowserBackDismiss(
    searchStatus !== "idle" && page === "filters",
    () => {
      closeFiltersRef.current()
    },
  )

  if (searchStatus === "idle") return null

  const openFilters = () => {
    captureReturnFocus()
    focusPage()
    setReturnPage(activePage === "filters" ? returnPage : activePage)
    setPage("filters")
    setSnap("full")
  }

  const closeFilters = () => {
    if (page === "filters") {
      dismissFilters()
      return
    }

    closeFiltersRef.current()
  }

  const handleBuildingSelect = (building: SearchBuilding | null) => {
    onBuildingHoverChange?.(null)
    if (building) {
      captureReturnFocus(building._id)
      focusPage()
    } else {
      restoreFocus()
    }
    onBuildingSelect(building)
    setPage(building ? "buildingDetail" : "results")
  }

  const showNewBuildingAction = canCreateListing && selectedPin !== null
  const listingIntentContent = isListingSearch ? (
    <ListingIntentNotice onExit={onExitListingSearch} />
  ) : null
  const listingActionContent = showNewBuildingAction ? (
    <NewBuildingActionCard
      isListingSearch={isListingSearch}
      onListNewBuilding={onListNewBuilding}
    />
  ) : null

  const selectedListersContent =
    selectedListers.length > 0 ? (
      <div className="mb-3 hidden min-w-0 items-center gap-2 px-4 lg:flex">
        <span className="shrink-0 text-xs font-semibold text-slate-500">
          Listers
        </span>
        <SelectedListerRail
          listers={selectedListers}
          onRemove={removeLister}
        />
      </div>
    ) : null

  const renderContent = (
    scrollRootRef: React.RefObject<HTMLDivElement | null>,
    showTitle: boolean,
    showInlineNavigation: boolean,
  ) => {
    const isMobilePanel = scrollRootRef === mobileScrollRootRef
    const filtersContent = (
      <FilterBar
        className="mb-3 lg:my-3"
        onOpenFilters={openFilters}
        triggerRef={
          isMobilePanel ? mobileFilterTriggerRef : desktopFilterTriggerRef
        }
      />
    )
    const pageFocusHeading = (
      <h2
        ref={isMobilePanel ? mobilePageHeadingRef : desktopPageHeadingRef}
        tabIndex={-1}
        className="sr-only outline-none"
      >
        {activePage === "filters"
          ? "Rental filters"
          : activePage === "buildingDetail" && selectedBuilding
            ? `${selectedBuilding.name} details`
            : "Building results"}
      </h2>
    )

    if (activePage === "filters") {
      return (
        <div className="px-4">
          {pageFocusHeading}
          <FilterConfigPage
            showInlineHeader={showInlineNavigation}
            onBack={closeFilters}
            onApplied={closeFilters}
          />
        </div>
      )
    }

    if (activePage === "buildingDetail" && selectedBuilding) {
      return (
        <>
          {pageFocusHeading}
          {listingIntentContent}
          {filtersContent}

          <div className={cn(RESULTS_PANEL_CONTENT_INSET_CLASS, "pb-4")}>
            <BuildingDetailPage
              scrollRootRef={scrollRootRef}
              showInlineBack={showInlineNavigation}
              onBack={() => handleBuildingSelect(null)}
            />
          </div>
        </>
      )
    }

    if (hasResults) {
      return (
        <>
          {pageFocusHeading}
          {listingIntentContent}
          {filtersContent}

          <div className={cn(RESULTS_PANEL_CONTENT_INSET_CLASS, "pb-4")}>
            {listingActionContent}

            {isPendingBuildingUnresolved && (
              <SearchStateMessage
                status={searchStatus}
                searchSource={searchSource}
                isListingSearch={isListingSearch}
                isPendingBuildingUnresolved
                onSearchAgain={onSearchAgain}
              />
            )}

            <BuildingListPage
              scrollRootRef={scrollRootRef}
              onBuildingSelect={handleBuildingSelect}
              showTitle={showTitle}
            />
          </div>
        </>
      )
    }

    return (
      <>
        {pageFocusHeading}
        {listingIntentContent}
        {filtersContent}
        {selectedListersContent}

        <div className="px-4 pb-4">
          {listingActionContent}

          <SearchStateMessage
            status={searchStatus}
            searchSource={searchSource}
            isListingSearch={isListingSearch}
            isPendingBuildingUnresolved={isPendingBuildingUnresolved}
            onSearchAgain={onSearchAgain}
          />
        </div>
      </>
    )
  }

  const panelTitle = getPanelTitle({
    activePage,
    selectedBuilding,
    searchStatus,
    searchSource,
    buildingsCount: buildings.length,
    isListingSearch,
  })
  const hasPanelBack = activePage === "filters" || activePage === "buildingDetail"
  const handlePanelBack = () => {
    if (activePage === "filters") {
      closeFilters()
      return
    }

    if (activePage === "buildingDetail") {
      handleBuildingSelect(null)
    }
  }

  const stopHeaderButtonDrag = preventDraggableBottomDrawerPropagation

  return (
    <BuildingDetailSessionProvider>
      <MapSearchResultsAnnouncement
        status={searchStatus}
        source={searchSource}
        buildingCount={buildings.length}
      />

      <DraggableBottomDrawer
        snap={snap}
        onSnapChange={setSnap}
        testId="results-panel-mobile"
        ariaLabel="Building search results"
        contentRef={mobileScrollRootRef}
        header={(dragHandle) => (
          <MobilePanelHeader
            title={panelTitle}
            canGoBack={hasPanelBack}
            selectedListers={selectedListers}
            onBack={handlePanelBack}
            onRemoveLister={removeLister}
            onHeaderButtonPointerDown={stopHeaderButtonDrag}
            {...dragHandle}
          />
        )}
      >
        {renderContent(mobileScrollRootRef, false, false)}
      </DraggableBottomDrawer>

      <aside
        data-testid="results-panel-desktop"
        className="absolute bottom-6 right-6 top-24 z-50 hidden w-[400px] overflow-hidden rounded-2xl bg-white text-slate-950 shadow-2xl lg:block"
      >
        <div ref={desktopScrollRootRef} className="h-full overflow-y-auto">
          {renderContent(desktopScrollRootRef, true, true)}
        </div>
      </aside>
    </BuildingDetailSessionProvider>
  )
}
