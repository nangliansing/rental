import { memo, useEffect, useRef } from "react"
import { useMapSearchMap } from "../../hooks/useMapSearchMap"

import type { SearchBounds } from "../../hooks/useMapBounds"
import { useMapProgrammaticMove } from "../../context/MapProgrammaticMoveContext"
import { useMapCameraTransition } from "../../hooks/useMapCameraTransition"
import type { MapPosition, SearchBuilding } from "../../types"
import {
  getMapCameraBoundsFromGoogleMap,
  getNearbyZoom,
  isPositionInsideMapCameraBounds,
} from "../../utils/map-camera"
import {
  getPositionFromBuildingLocation,
  isValidMapPosition,
  isValidSearchBounds,
} from "../../utils/map-position"

const BUILDING_FOCUS_PADDING = 48

export const MapCameraRestorer = memo(function MapCameraRestorer({
  restoreVersion,
  bounds,
  pin,
  radiusMeters,
  selectedBuilding,
}: {
  restoreVersion: number
  bounds: SearchBounds | null
  pin: MapPosition | null
  radiusMeters: number
  selectedBuilding: SearchBuilding | null
}) {
  const map = useMapSearchMap()
  const { beginProgrammaticMove } = useMapProgrammaticMove()
  const camera = useMapCameraTransition(map)
  const restoredVersionRef = useRef(0)
  const focusedBuildingIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!selectedBuilding) {
      focusedBuildingIdRef.current = null
      return
    }
    if (focusedBuildingIdRef.current === selectedBuilding._id) return

    const buildingPosition = getPositionFromBuildingLocation(
      selectedBuilding.location,
    )
    if (!isValidMapPosition(buildingPosition) || !map) return

    focusedBuildingIdRef.current = selectedBuilding._id

    const cameraBounds = getMapCameraBoundsFromGoogleMap(map)
    if (isPositionInsideMapCameraBounds(buildingPosition, cameraBounds)) {
      return
    }

    beginProgrammaticMove()
    map.panTo(buildingPosition)
  }, [beginProgrammaticMove, map, selectedBuilding])

  useEffect(() => {
    if (!map || restoreVersion === 0) return
    if (restoredVersionRef.current === restoreVersion) return
    restoredVersionRef.current = restoreVersion
    beginProgrammaticMove()

    if (isValidMapPosition(pin)) {
      camera.flyTo(pin, getNearbyZoom(radiusMeters))
      return
    }

    if (isValidSearchBounds(bounds)) {
      map.fitBounds(
        {
          north: bounds.northEast.lat,
          east: bounds.northEast.lng,
          south: bounds.southWest.lat,
          west: bounds.southWest.lng,
        },
        BUILDING_FOCUS_PADDING,
      )
    }
  }, [
    beginProgrammaticMove,
    bounds,
    camera,
    map,
    pin,
    radiusMeters,
    restoreVersion,
  ])

  return null
})
