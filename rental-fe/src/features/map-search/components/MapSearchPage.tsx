import { useState } from "react"
import { useSearchParams } from "react-router-dom"

import { MapView } from "./MapView"
import { BuildingResultsPanel } from "./results/BuildingResultsPanel"
import { DEFAULT_MAP_SEARCH_FILTERS } from "../context/MapSearchFilterContext"
import { MapSearchProviders } from "../context/MapSearchProviders"
import { MapInteractionProvider } from "../context/MapInteractionProvider"
import { parseMapSearchUrl } from "../utils/map-search-url"
import { useMapSearchPageState } from "../hooks/useMapSearchPageState"

function MapSearchPageContent({
  initialUrlState,
}: {
  initialUrlState: ReturnType<typeof parseMapSearchUrl>
}) {
  const { filterState, searchStatus, isPlaceSearchOpen, session } =
    useMapSearchPageState(initialUrlState)

  return (
    <MapSearchProviders
      filter={filterState}
      place={session.place}
      controls={session.controls}
      canvas={session.canvas}
      results={session.results}
      markerHighlight={session.markerHighlight}
    >
      <main className="relative h-screen w-screen overflow-hidden">
        <MapView />

        {!isPlaceSearchOpen && searchStatus !== "idle" && (
          <BuildingResultsPanel />
        )}
      </main>
    </MapSearchProviders>
  )
}

export function MapSearchPage() {
  const [searchParams] = useSearchParams()
  const [initialUrlState] = useState(() =>
    parseMapSearchUrl(searchParams, DEFAULT_MAP_SEARCH_FILTERS),
  )

  return (
    <MapInteractionProvider
      initialPosition={initialUrlState.position}
      initialLineMode={initialUrlState.source === "line"}
    >
      <MapSearchPageContent initialUrlState={initialUrlState} />
    </MapInteractionProvider>
  )
}
