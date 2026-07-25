import { createContext, useContext } from "react"

export type MapSearchMarkerHighlightContextValue = {
  hoveredBuildingId: string | null
  selectedBuildingId: string | null
}

export const MapSearchMarkerHighlightContext =
  createContext<MapSearchMarkerHighlightContextValue | null>(null)

export function useMapSearchMarkerHighlight() {
  const context = useContext(MapSearchMarkerHighlightContext)
  if (!context) {
    throw new Error(
      "useMapSearchMarkerHighlight must be used within MapSearchProviders",
    )
  }
  return context
}
