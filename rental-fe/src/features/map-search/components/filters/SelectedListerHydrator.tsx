import { useEffect } from "react"

import { LISTER_MAP_SEARCH_LOCATION_STATE_KEY } from "@/features/agent/lister-map-search/navigationState"
import type { ListerMapSearchSeed } from "@/features/agent/lister-map-search/types"
import { useMapSearchFilters } from "../../context/MapSearchFilterContext"
import type { MapSearchFilters } from "../../filters/types"
import { useHydrateSelectedListers } from "../../hooks/useHydrateSelectedListers"

type SelectedListerHydratorProps = {
  filters: MapSearchFilters
  listerSeed: ListerMapSearchSeed | null
}

export function SelectedListerHydrator({
  filters,
  listerSeed,
}: SelectedListerHydratorProps) {
  const { selectedListerIds, hydrateSelectedListers } = useMapSearchFilters()

  useHydrateSelectedListers({
    filters,
    listerSeed,
    selectedListerIds,
    hydrateSelectedListers,
  })

  useEffect(() => {
    if (typeof window === "undefined") return

    const { state } = window.history
    if (!state || typeof state !== "object") return
    if (!(LISTER_MAP_SEARCH_LOCATION_STATE_KEY in state)) return

    const nextState = { ...(state as Record<string, unknown>) }
    delete nextState[LISTER_MAP_SEARCH_LOCATION_STATE_KEY]
    const { pathname, search, hash } = window.location
    window.history.replaceState(nextState, "", `${pathname}${search}${hash}`)
  }, [])

  return null
}
