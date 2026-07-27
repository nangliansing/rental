import { memo, useLayoutEffect, type RefObject } from "react"

import { useNeighbourhoodExplorePlaceSelection } from "../../hooks/useNeighbourhoodExplorePlaceSelection"
import type { NeighbourhoodPlaceListHandle } from "../list/NeighbourhoodPlaceList"

const LIST_SCROLL_RETRY_DELAYS_MS = [0, 16, 120, 240] as const

type NeighbourhoodExploreListPlaceSyncProps = {
  listRef: RefObject<NeighbourhoodPlaceListHandle | null>
  isListScrollEnabled?: boolean
  syncKey?: string | number | boolean
}

function scrollActivePlaceIntoView(
  listRef: RefObject<NeighbourhoodPlaceListHandle | null>,
  placeId: string,
) {
  for (const delay of LIST_SCROLL_RETRY_DELAYS_MS) {
    if (delay === 0) {
      if (listRef.current?.scrollToPlace(placeId)) {
        return true
      }
      continue
    }

    window.setTimeout(() => {
      listRef.current?.scrollToPlace(placeId)
    }, delay)
  }

  return false
}

/**
 * When the shared active place changes, scroll the matching list item into view
 * only if it is outside the list viewport.
 */
export const NeighbourhoodExploreListPlaceSync = memo(
  function NeighbourhoodExploreListPlaceSync({
    listRef,
    isListScrollEnabled = true,
    syncKey,
  }: NeighbourhoodExploreListPlaceSyncProps) {
    const { selectedPlaceId, selectedPlaceRevision } =
      useNeighbourhoodExplorePlaceSelection()

    useLayoutEffect(() => {
      if (!selectedPlaceId || !isListScrollEnabled) {
        return
      }

      scrollActivePlaceIntoView(listRef, selectedPlaceId)
    }, [
      isListScrollEnabled,
      listRef,
      selectedPlaceId,
      selectedPlaceRevision,
      syncKey,
    ])

    return null
  },
)
