import { useCallback, useRef } from "react"

import { useNeighbourhoodExploreData } from "../../NeighbourhoodExploreContext"
import { SELECT_PLACE_WITHOUT_LIST_SCROLL } from "../../context/NeighbourhoodExploreSelectionContext"
import { useNeighbourhoodExplorePlaceSelection } from "../../hooks/useNeighbourhoodExplorePlaceSelection"
import { NeighbourhoodExploreListPlaceSync } from "../sync/NeighbourhoodExploreListPlaceSync"
import {
  NeighbourhoodPlaceList,
  type NeighbourhoodPlaceListHandle,
} from "./NeighbourhoodPlaceList"

type NeighbourhoodPlaceListPanelProps = {
  className?: string
  listClassName?: string
  header?: React.ReactNode
  isListScrollEnabled?: boolean
  scrollRootRef?: React.RefObject<HTMLElement | null>
}

export function NeighbourhoodPlaceListPanel({
  className,
  listClassName,
  header,
  isListScrollEnabled = true,
  scrollRootRef,
}: NeighbourhoodPlaceListPanelProps) {
  const { visiblePlaces } = useNeighbourhoodExploreData()
  const { selectedPlaceId, selectPlace } = useNeighbourhoodExplorePlaceSelection()
  const listRef = useRef<NeighbourhoodPlaceListHandle>(null)
  const handlePlaceSelect = useCallback(
    (placeId: string) => {
      selectPlace(placeId, SELECT_PLACE_WITHOUT_LIST_SCROLL)
    },
    [selectPlace],
  )

  return (
    <>
      <NeighbourhoodExploreListPlaceSync
        listRef={listRef}
        isListScrollEnabled={isListScrollEnabled}
      />
      <div className={className}>
        {header}
        <NeighbourhoodPlaceList
          ref={listRef}
          places={visiblePlaces}
          activePlaceId={selectedPlaceId}
          onPlaceSelect={handlePlaceSelect}
          listClassName={listClassName}
          scrollRootRef={scrollRootRef}
        />
      </div>
    </>
  )
}
