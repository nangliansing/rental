import { memo, useEffect, type RefObject } from "react"

import { useNeighbourhoodExplorePlaceSelection } from "../../hooks/useNeighbourhoodExplorePlaceSelection"
import type { NeighbourhoodPlaceListHandle } from "../list/NeighbourhoodPlaceList"

const MAX_SCROLL_TO_PLACE_ATTEMPTS = 3

type NeighbourhoodExploreListPlaceSyncProps = {
  listRef: RefObject<NeighbourhoodPlaceListHandle | null>
  isListScrollEnabled?: boolean
}

function scrollActivePlaceIntoView(
  listRef: RefObject<NeighbourhoodPlaceListHandle | null>,
  placeId: string,
  attempt = 0,
) {
  if (
    listRef.current?.scrollToPlace(placeId) ||
    attempt + 1 >= MAX_SCROLL_TO_PLACE_ATTEMPTS
  ) {
    return
  }

  requestAnimationFrame(() => {
    scrollActivePlaceIntoView(listRef, placeId, attempt + 1)
  })
}

/**
 * Scrolls the active list item into view for map-driven selections only.
 */
export const NeighbourhoodExploreListPlaceSync = memo(
  function NeighbourhoodExploreListPlaceSync({
    listRef,
    isListScrollEnabled = true,
  }: NeighbourhoodExploreListPlaceSyncProps) {
    const {
      selectedPlaceId,
      selectedPlaceRevision,
      shouldScrollSelectedPlaceIntoView,
    } = useNeighbourhoodExplorePlaceSelection()

    const shouldSyncListScroll =
      Boolean(selectedPlaceId) &&
      isListScrollEnabled &&
      shouldScrollSelectedPlaceIntoView

    useEffect(() => {
      if (!shouldSyncListScroll || !selectedPlaceId) {
        return
      }

      scrollActivePlaceIntoView(listRef, selectedPlaceId)
    }, [listRef, selectedPlaceId, selectedPlaceRevision, shouldSyncListScroll])

    return null
  },
)
