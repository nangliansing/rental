import { useState } from "react"
import { useLocation, useSearchParams } from "react-router-dom"

import { extractAgentProfileIds } from "@/features/agent/lister-map-search/extractAgentProfileIds"
import {
  isListerMapSearchSeedMatchingIds,
  readListerMapSearchSeedFromLocationState,
} from "@/features/agent/lister-map-search/navigationState"
import { toSearchAgentProfileFromSeed } from "@/features/agent/lister-map-search/toSearchAgentProfile"
import type { ListerMapSearchSeed } from "@/features/agent/lister-map-search/types"
import type { SearchAgentProfile } from "@/features/agent/api/searchAgentProfiles"

import { SelectedListerHydrator } from "./filters/SelectedListerHydrator"
import { ListerMapSearchArrivalToast } from "./filters/ListerMapSearchArrivalToast"
import { MapView } from "./MapView"
import { BuildingResultsPanel } from "./results/BuildingResultsPanel"
import { DEFAULT_MAP_SEARCH_FILTERS } from "../context/MapSearchFilterContext"
import { MapSearchProviders } from "../context/MapSearchProviders"
import { MapInteractionProvider } from "../context/MapInteractionProvider"
import { parseMapSearchUrl } from "../utils/map-search-url"
import { useMapSearchPageState } from "../hooks/useMapSearchPageState"

function MapSearchPageContent({
  initialUrlState,
  initialSelectedListers,
  listerSeed,
}: {
  initialUrlState: ReturnType<typeof parseMapSearchUrl>
  initialSelectedListers: SearchAgentProfile[]
  listerSeed: ListerMapSearchSeed | null
}) {
  const { filterState, searchStatus, isPlaceSearchOpen, session } =
    useMapSearchPageState(initialUrlState, { initialSelectedListers })

  return (
    <MapSearchProviders
      filter={filterState}
      place={session.place}
      controls={session.controls}
      canvas={session.canvas}
      results={session.results}
      markerHighlight={session.markerHighlight}
    >
      <SelectedListerHydrator
        filters={filterState.submittedFilters}
        listerSeed={listerSeed}
      />

      <ListerMapSearchArrivalToast
        isSearchIdle={searchStatus === "idle"}
        listerSeed={listerSeed}
      />

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
  const location = useLocation()
  const [initialState] = useState(() => {
    const urlState = parseMapSearchUrl(searchParams, DEFAULT_MAP_SEARCH_FILTERS)
    const listerSeed = readListerMapSearchSeedFromLocationState(location.state)
    const agentProfileIds = extractAgentProfileIds(urlState.filters)
    const initialSelectedListers =
      listerSeed && isListerMapSearchSeedMatchingIds(listerSeed, agentProfileIds)
        ? [toSearchAgentProfileFromSeed(listerSeed)]
        : []

    return {
      urlState,
      initialSelectedListers,
      listerSeed,
    }
  })

  return (
    <MapInteractionProvider
      initialPosition={initialState.urlState.position}
      initialLineMode={initialState.urlState.source === "line"}
    >
      <MapSearchPageContent
        initialUrlState={initialState.urlState}
        initialSelectedListers={initialState.initialSelectedListers}
        listerSeed={initialState.listerSeed}
      />
    </MapInteractionProvider>
  )
}
