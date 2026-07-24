import { memo, useEffect, useRef } from "react"
import { useMap } from "@vis.gl/react-google-maps"

import type { SearchBounds } from "../../hooks/useMapBounds"
import { useMapCameraTransition } from "../../hooks/useMapCameraTransition"
import type { MapPosition, SearchBuilding } from "../../types"
import {
  getBuildingSelectionCameraBounds,
  getNearbyZoom,
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
  onRestoreStart,
}: {
  restoreVersion: number
  bounds: SearchBounds | null
  pin: MapPosition | null
  radiusMeters: number
  selectedBuilding: SearchBuilding | null
  onRestoreStart: () => void
}) {
  const map = useMap()
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
    onRestoreStart()

    const selectionBounds = getBuildingSelectionCameraBounds({
      buildingPosition,
      pin,
      searchBounds: bounds,
    })

    if (selectionBounds) {
      map.fitBounds(selectionBounds, BUILDING_FOCUS_PADDING)
      return
    }

    camera.flyTo(
      buildingPosition,
      Math.max(map.getZoom() ?? 0, 16),
    )
  }, [bounds, camera, map, onRestoreStart, pin, selectedBuilding])

  useEffect(() => {
    if (!map || restoreVersion === 0) return
    if (restoredVersionRef.current === restoreVersion) return
    restoredVersionRef.current = restoreVersion
    onRestoreStart()

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
  }, [bounds, camera, map, onRestoreStart, pin, radiusMeters, restoreVersion])

  return null
})
