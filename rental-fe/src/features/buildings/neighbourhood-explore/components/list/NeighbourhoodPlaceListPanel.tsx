import { useRef } from "react"

import { useNeighbourhoodExploreData } from "../../NeighbourhoodExploreContext"
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
  scrollSyncKey?: string | number | boolean
}

export function NeighbourhoodPlaceListPanel({
  className,
  listClassName,
  header,
  isListScrollEnabled = true,
  scrollRootRef,
  scrollSyncKey,
}: NeighbourhoodPlaceListPanelProps) {
  const { visiblePlaces } = useNeighbourhoodExploreData()
  const { selectedPlaceId, selectPlace } = useNeighbourhoodExplorePlaceSelection()
  const listRef = useRef<NeighbourhoodPlaceListHandle>(null)

  return (
    <>
      <NeighbourhoodExploreListPlaceSync
        listRef={listRef}
        isListScrollEnabled={isListScrollEnabled}
        syncKey={scrollSyncKey}
      />
      <div className={className}>
        {header}
        <NeighbourhoodPlaceList
          ref={listRef}
          places={visiblePlaces}
          activePlaceId={selectedPlaceId}
          onPlaceSelect={selectPlace}
          listClassName={listClassName}
          scrollRootRef={scrollRootRef}
        />
      </div>
    </>
  )
}
