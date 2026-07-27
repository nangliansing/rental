import { memo, useEffect } from "react"

import {
  getMapCameraBoundsFromGoogleMap,
  isPositionInsideMapCameraBounds,
} from "@/features/map-search/utils/map-camera"
import { isValidMapPosition } from "@/features/map-search/utils/map-position"

import { useNeighbourhoodExplorePlaceSelection } from "../../hooks/useNeighbourhoodExplorePlaceSelection"
import { useNeighbourhoodExploreMap } from "../../hooks/useNeighbourhoodExploreMap"

/**
 * When the shared active place changes, pan the map to the matching pin
 * only if it is outside the current map viewport.
 */
export const NeighbourhoodExploreMapPlaceSync = memo(
  function NeighbourhoodExploreMapPlaceSync() {
    const map = useNeighbourhoodExploreMap()
    const { selectedPlace, selectedPlaceRevision } =
      useNeighbourhoodExplorePlaceSelection()

    useEffect(() => {
      if (!map || !selectedPlace) {
        return
      }

      const position = { lat: selectedPlace.lat, lng: selectedPlace.lng }
      if (!isValidMapPosition(position)) {
        return
      }

      const cameraBounds = getMapCameraBoundsFromGoogleMap(map)
      if (isPositionInsideMapCameraBounds(position, cameraBounds)) {
        return
      }

      map.panTo(position)
    }, [map, selectedPlace, selectedPlaceRevision])

    return null
  },
)
