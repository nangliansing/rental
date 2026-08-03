import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react"
import { useDebouncedCallback } from "use-debounce"

import type { SearchAgentProfile } from "@/features/agent"
import { extractAgentProfileIds } from "@/features/agent/lister-map-search/extractAgentProfileIds"

import { removeFilterChip } from "../filters/removeFilterChip"
import type { FilterChip, MapSearchFilters } from "../filters/types"

export const FILTER_REMOVAL_DEBOUNCE_MS = 400

export const DEFAULT_MAP_SEARCH_FILTERS: MapSearchFilters = {
  minRent: 1000,
  maxRent: 8000,
  isForeignerAccepted: true,
}

type FilterState = {
  filters: MapSearchFilters
  submittedFilters: MapSearchFilters
  selectedListers: SearchAgentProfile[]
}

type FilterAction =
  | { type: "applyFilters"; filters: MapSearchFilters }
  | { type: "submitFilters" }
  | { type: "setSubmittedFilters"; filters: MapSearchFilters }
  | { type: "removeFilter"; chip: FilterChip }
  | { type: "toggleLister"; lister: SearchAgentProfile }
  | { type: "removeLister"; listerId: string }
  | { type: "hydrateSelectedListers"; listers: SearchAgentProfile[] }

type UseMapSearchFilterStateOptions = {
  onFiltersChanged?: (filters: MapSearchFilters) => void
  initialFilters?: MapSearchFilters
  initialSelectedListers?: SearchAgentProfile[]
}

export type MapSearchFilterContextValue = {
  filters: MapSearchFilters
  submittedFilters: MapSearchFilters
  selectedListers: SearchAgentProfile[]
  selectedListerIds: string[]
  applyFilters: (filters: MapSearchFilters) => void
  submitFilters: () => MapSearchFilters
  removeFilter: (chip: FilterChip) => void
  toggleLister: (lister: SearchAgentProfile) => void
  removeLister: (listerId: string) => void
  hydrateSelectedListers: (listers: SearchAgentProfile[]) => void
}

export const MapSearchFilterContext =
  createContext<MapSearchFilterContextValue | null>(null)

function syncFiltersWithListers(
  filters: MapSearchFilters,
  selectedListers: SearchAgentProfile[],
): MapSearchFilters {
  const nextFilters = { ...filters }
  const agentProfileIds = selectedListers.map((lister) => lister._id)

  delete nextFilters.agentProfileIds
  delete nextFilters.listerIds

  if (agentProfileIds.length === 0) {
    return nextFilters
  }

  return {
    ...nextFilters,
    agentProfileIds,
  }
}

function mapSearchFilterReducer(
  state: FilterState,
  action: FilterAction,
): FilterState {
  if (action.type === "submitFilters") {
    return {
      ...state,
      submittedFilters: state.filters,
    }
  }

  if (action.type === "setSubmittedFilters") {
    return {
      ...state,
      submittedFilters: action.filters,
    }
  }

  if (action.type === "applyFilters") {
    const filters = syncFiltersWithListers(
      action.filters,
      state.selectedListers,
    )

    return {
      ...state,
      filters,
      submittedFilters: filters,
    }
  }

  if (action.type === "removeFilter") {
    const filters = removeFilterChip(state.filters, action.chip)
    const shouldClearListers =
      action.chip.key === "agentProfileIds" || action.chip.key === "listerIds"

    return {
      ...state,
      filters,
      selectedListers: shouldClearListers ? [] : state.selectedListers,
    }
  }

  if (action.type === "toggleLister") {
    const isSelected = state.selectedListers.some(
      (lister) => lister._id === action.lister._id,
    )
    const selectedListers = isSelected
      ? state.selectedListers.filter(
          (lister) => lister._id !== action.lister._id,
        )
      : [...state.selectedListers, action.lister]
    const filters = syncFiltersWithListers(state.filters, selectedListers)

    return {
      ...state,
      filters,
      selectedListers,
    }
  }

  if (action.type === "removeLister") {
    const selectedListers = state.selectedListers.filter(
      (lister) => lister._id !== action.listerId,
    )
    const filters = syncFiltersWithListers(state.filters, selectedListers)

    return {
      ...state,
      filters,
      selectedListers,
    }
  }

  if (action.type === "hydrateSelectedListers") {
    const allowedIds = new Set([
      ...(state.filters.agentProfileIds ?? []),
      ...(state.filters.listerIds ?? []),
    ])
    const listersById = new Map(
      state.selectedListers.map((lister) => [lister._id, lister]),
    )

    for (const lister of action.listers) {
      if (!allowedIds.has(lister._id) || listersById.has(lister._id)) continue
      listersById.set(lister._id, lister)
    }

    const selectedListers = [...listersById.values()]
    const filters = syncFiltersWithListers(state.filters, selectedListers)

    return {
      ...state,
      filters,
      submittedFilters: filters,
      selectedListers,
    }
  }

  return state
}

function createInitialFilterState({
  initialFilters = DEFAULT_MAP_SEARCH_FILTERS,
  initialSelectedListers = [],
}: UseMapSearchFilterStateOptions = {}) {
  const filters = syncFiltersWithListers(initialFilters, initialSelectedListers)
  const pendingListerIds = extractAgentProfileIds(initialFilters)

  if (pendingListerIds.length > 0 && initialSelectedListers.length === 0) {
    const filtersWithPendingListers = {
      ...filters,
      agentProfileIds: pendingListerIds,
    }

    return {
      filters: filtersWithPendingListers,
      submittedFilters: filtersWithPendingListers,
      selectedListers: initialSelectedListers,
    }
  }

  return {
    filters,
    submittedFilters: filters,
    selectedListers: initialSelectedListers,
  }
}

export function useMapSearchFilterState({
  onFiltersChanged,
  initialFilters = DEFAULT_MAP_SEARCH_FILTERS,
  initialSelectedListers = [],
}: UseMapSearchFilterStateOptions = {}): MapSearchFilterContextValue {
  const [state, dispatch] = useReducer(
    mapSearchFilterReducer,
    { initialFilters, initialSelectedListers },
    createInitialFilterState,
  )
  const latestStateRef = useRef(state)

  useEffect(() => {
    latestStateRef.current = state
  }, [state])

  const dispatchStateAction = useCallback((action: FilterAction) => {
    const nextState = mapSearchFilterReducer(latestStateRef.current, action)
    latestStateRef.current = nextState
    dispatch(action)
    return nextState
  }, [])

  const submitRemovedFilters = useDebouncedCallback(
    (filters: MapSearchFilters) => {
      dispatchStateAction({ type: "setSubmittedFilters", filters })
      onFiltersChanged?.(filters)
    },
    FILTER_REMOVAL_DEBOUNCE_MS,
  )

  const applyFilters = useCallback(
    (filters: MapSearchFilters) => {
      submitRemovedFilters.cancel()
      const nextState = dispatchStateAction({ type: "applyFilters", filters })
      onFiltersChanged?.(nextState.submittedFilters)
    },
    [dispatchStateAction, onFiltersChanged, submitRemovedFilters],
  )

  const submitFilters = useCallback(() => {
    submitRemovedFilters.cancel()
    const nextState = dispatchStateAction({ type: "submitFilters" })
    return nextState.filters
  }, [dispatchStateAction, submitRemovedFilters])

  const removeFilter = useCallback(
    (chip: FilterChip) => {
      const nextState = dispatchStateAction({ type: "removeFilter", chip })
      submitRemovedFilters(nextState.filters)
    },
    [dispatchStateAction, submitRemovedFilters],
  )

  const toggleLister = useCallback(
    (lister: SearchAgentProfile) => {
      const nextState = dispatchStateAction({ type: "toggleLister", lister })
      submitRemovedFilters(nextState.filters)
    },
    [dispatchStateAction, submitRemovedFilters],
  )

  const removeLister = useCallback(
    (listerId: string) => {
      const nextState = dispatchStateAction({ type: "removeLister", listerId })
      submitRemovedFilters(nextState.filters)
    },
    [dispatchStateAction, submitRemovedFilters],
  )

  const hydrateSelectedListers = useCallback(
    (listers: SearchAgentProfile[]) => {
      if (listers.length === 0) return

      submitRemovedFilters.cancel()
      const nextState = dispatchStateAction({
        type: "hydrateSelectedListers",
        listers,
      })
      onFiltersChanged?.(nextState.submittedFilters)
    },
    [dispatchStateAction, onFiltersChanged, submitRemovedFilters],
  )

  const selectedListerIds = useMemo(
    () => state.selectedListers.map((lister) => lister._id),
    [state.selectedListers],
  )

  return useMemo(
    () => ({
      filters: state.filters,
      submittedFilters: state.submittedFilters,
      selectedListers: state.selectedListers,
      selectedListerIds,
      applyFilters,
      submitFilters,
      removeFilter,
      toggleLister,
      removeLister,
      hydrateSelectedListers,
    }),
    [
      state.filters,
      state.submittedFilters,
      state.selectedListers,
      selectedListerIds,
      applyFilters,
      submitFilters,
      removeFilter,
      toggleLister,
      removeLister,
      hydrateSelectedListers,
    ],
  )
}

export function useMapSearchFilters() {
  const context = useContext(MapSearchFilterContext)

  if (!context) {
    throw new Error(
      "useMapSearchFilters must be used within MapSearchFilterContext.Provider",
    )
  }

  return context
}
