import { useMap } from "@vis.gl/react-google-maps"

import { isValidSearchBounds } from "../utils/map-position"

export type SearchBounds = {
  northEast: {
    lat: number
    lng: number
  }
  southWest: {
    lat: number
    lng: number
  }
}

export function useMapBounds() {
  const map = useMap()

  const getCurrentBounds = (): SearchBounds | null => {
    const bounds = map?.getBounds()
    if (!bounds) return null

    const northEast = bounds.getNorthEast()
    const southWest = bounds.getSouthWest()
    const candidate = {
      northEast: {
        lat: northEast.lat(),
        lng: northEast.lng(),
      },
      southWest: {
        lat: southWest.lat(),
        lng: southWest.lng(),
      },
    }

    return isValidSearchBounds(candidate) ? candidate : null
  }

  return {
    getCurrentBounds,
  }
}
