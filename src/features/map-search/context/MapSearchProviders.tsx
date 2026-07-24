import type { ReactNode } from "react"

import {
  MapSearchFilterContext,
  type MapSearchFilterContextValue,
} from "./MapSearchFilterContext"
import {
  MapSearchMarkerHighlightContext,
  type MapSearchMarkerHighlightContextValue,
} from "./MapSearchMarkerHighlightContext"
import {
  MapSearchCanvasContext,
  MapSearchControlsContext,
  MapSearchPlaceContext,
  MapSearchResultsContext,
  type MapSearchCanvasContextValue,
  type MapSearchControlsContextValue,
  type MapSearchPlaceContextValue,
  type MapSearchResultsContextValue,
} from "./MapSearchSessionContext"

export function MapSearchProviders({
  filter,
  place,
  controls,
  canvas,
  results,
  markerHighlight,
  children,
}: {
  filter: MapSearchFilterContextValue
  place: MapSearchPlaceContextValue
  controls: MapSearchControlsContextValue
  canvas: MapSearchCanvasContextValue
  results: MapSearchResultsContextValue
  markerHighlight: MapSearchMarkerHighlightContextValue
  children: ReactNode
}) {
  return (
    <MapSearchFilterContext.Provider value={filter}>
      <MapSearchPlaceContext.Provider value={place}>
        <MapSearchControlsContext.Provider value={controls}>
          <MapSearchCanvasContext.Provider value={canvas}>
            <MapSearchMarkerHighlightContext.Provider value={markerHighlight}>
              <MapSearchResultsContext.Provider value={results}>
                {children}
              </MapSearchResultsContext.Provider>
            </MapSearchMarkerHighlightContext.Provider>
          </MapSearchCanvasContext.Provider>
        </MapSearchControlsContext.Provider>
      </MapSearchPlaceContext.Provider>
    </MapSearchFilterContext.Provider>
  )
}
