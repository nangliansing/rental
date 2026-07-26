import { memo, useCallback, useEffect, useRef, useState } from "react"
import { useDebouncedCallback } from "use-debounce"
import { cn } from "@/lib/utils"
import { useBrowserBackDismiss } from "@/shared/hooks/useBrowserBackDismiss"
import { useMapSearchFilters } from "../../context/MapSearchFilterContext"
import { useMapSearchPlace } from "../../context/MapSearchSessionContext"
import {
  usePlaceSearch,
  type PlacePrediction,
} from "../../hooks/usePlaceSearch"
import { useAgentTypeahead } from "../../hooks/useAgentTypeahead"
import { DesktopPlaceSearchCombobox } from "./DesktopPlaceSearchCombobox"
import { MobilePlaceSearchButton } from "./MobilePlaceSearchButton"
import { MobilePlaceSearchOverlay } from "./MobilePlaceSearchOverlay"
import {
  MIN_SEARCH_QUERY_LENGTH,
  TYPEAHEAD_DEBOUNCE_MS,
} from "./search.constants"
import type { SearchMode } from "./SearchModeTabs"

export const PlaceSearch = memo(function PlaceSearch() {
  const { selectedListerIds, toggleLister } = useMapSearchFilters()
  const {
    searchedPlace,
    onPlaceFound,
    onPlaceSearchOpenChange,
  } = useMapSearchPlace()
  const selectedPlaceName = searchedPlace?.name
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mobileSearchButtonRef = useRef<HTMLButtonElement>(null)
  const shouldRestoreMobileFocusRef = useRef(false)
  const placeSearchRequestRef = useRef(0)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [isDesktopSuggestionsOpen, setIsDesktopSuggestionsOpen] =
    useState(false)
  const [searchMode, setSearchMode] = useState<SearchMode>("places")
  const [placeQuery, setPlaceQuery] = useState("")
  const [isPlaceSearchLoading, setIsPlaceSearchLoading] = useState(false)
  const {
    query: listerQuery,
    results: listers,
    error: listerSearchError,
    isLoading: isListerSearchLoading,
    setQuery: setListerQuery,
    clearError: clearListerSearchError,
    clearResults: clearListers,
    cancelRequest: cancelListerRequest,
    stopSearch: stopListerSearch,
    search: searchListers,
  } = useAgentTypeahead()

  const {
    predictions,
    predictionError,
    cancelPredictionRequest,
    clearPredictionError,
    clearPredictions,
    getPredictions,
    searchPlace,
    selectPrediction,
  } = usePlaceSearch()

  const setDesktopSuggestionsOpen = useCallback((isOpen: boolean) => {
    setIsDesktopSuggestionsOpen(isOpen)
  }, [])

  useEffect(() => {
    if (!isDesktopSuggestionsOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setDesktopSuggestionsOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [isDesktopSuggestionsOpen, setDesktopSuggestionsOpen])

  useEffect(() => {
    if (!selectedPlaceName || !inputRef.current) return

    inputRef.current.value = selectedPlaceName
  }, [selectedPlaceName])

  useEffect(() => {
    if (isMobileSearchOpen || !shouldRestoreMobileFocusRef.current) return

    shouldRestoreMobileFocusRef.current = false
    mobileSearchButtonRef.current?.focus()
  }, [isMobileSearchOpen])

  const closeSearchUi = () => {
    cancelPendingSearch()
    shouldRestoreMobileFocusRef.current = isMobileSearchOpen
    setIsMobileSearchOpen(false)
    setDesktopSuggestionsOpen(false)
    onPlaceSearchOpenChange(false)
  }

  useBrowserBackDismiss(isMobileSearchOpen, closeSearchUi)

  const searchPlaces = async (value: string) => {
    const query = value.trim()
    setPlaceQuery(query)

    placeSearchRequestRef.current += 1
    const requestId = placeSearchRequestRef.current

    if (query.length < MIN_SEARCH_QUERY_LENGTH) {
      setIsPlaceSearchLoading(false)
      void getPredictions("")
      return
    }

    try {
      setIsPlaceSearchLoading(true)
      await getPredictions(query)
    } finally {
      if (requestId === placeSearchRequestRef.current) {
        setIsPlaceSearchLoading(false)
      }
    }
  }

  const debouncedSearch = useDebouncedCallback(
    (mode: SearchMode, value: string) => {
      if (mode === "listers") {
        void searchListers(value)
        return
      }

      void searchPlaces(value)
    },
    TYPEAHEAD_DEBOUNCE_MS,
  )

  const cancelPendingSearch = useCallback(() => {
    debouncedSearch.cancel()
    placeSearchRequestRef.current += 1
    stopListerSearch()
    cancelPredictionRequest()
    setIsPlaceSearchLoading(false)
  }, [cancelPredictionRequest, debouncedSearch, stopListerSearch])

  useEffect(
    () => () => {
      debouncedSearch.cancel()
      placeSearchRequestRef.current += 1
      cancelListerRequest()
      cancelPredictionRequest()
    },
    [cancelListerRequest, cancelPredictionRequest, debouncedSearch],
  )

  const handleSearch = async () => {
    if (searchMode === "listers") {
      if (debouncedSearch.isPending()) {
        debouncedSearch.flush()
        return
      }

      if (listers[0]) {
        toggleLister(listers[0])
      }

      return
    }

    const didFindPlace = await searchPlace({
      query: inputRef.current?.value ?? "",
      onPlaceFound,
    })

    if (didFindPlace) closeSearchUi()
  }

  const handleSearchModeChange = (mode: SearchMode) => {
    cancelPendingSearch()
    clearPredictionError()
    clearListerSearchError()
    setSearchMode(mode)
    const value =
      inputRef.current?.value || listerQuery || placeQuery || selectedPlaceName || ""
    const shouldOpen = value.trim().length >= MIN_SEARCH_QUERY_LENGTH

    if (inputRef.current) {
      inputRef.current.value = value
    }

    if (mode === "listers") {
      setListerQuery(value.trim())
      if (shouldOpen) debouncedSearch(mode, value)
    } else {
      clearListers()
      setListerQuery("")
      setPlaceQuery(value.trim())
      if (shouldOpen) debouncedSearch(mode, value)
    }

    setDesktopSuggestionsOpen(shouldOpen)
  }

  const handleSelectSuggestion = async (prediction: PlacePrediction) => {
    if (inputRef.current) {
      inputRef.current.value = prediction.text
    }

    const didSelectPlace = await selectPrediction(
      prediction.prediction,
      onPlaceFound,
    )

    if (didSelectPlace) closeSearchUi()
  }

  const handleOpenMobileSearch = () => {
    const value = selectedPlaceName ?? ""

    if (inputRef.current) {
      inputRef.current.value = value
    }

    setIsMobileSearchOpen(true)
    onPlaceSearchOpenChange(true)

    if (searchMode === "places") {
      void searchPlaces(value)
    } else {
      void searchListers(value)
    }
  }

  const handleDesktopFocus = () => {
    const shouldOpen =
      (inputRef.current?.value ?? "").trim().length >= MIN_SEARCH_QUERY_LENGTH

    setDesktopSuggestionsOpen(shouldOpen)
  }

  const searchCurrentMode = (value: string) => {
    const query = value.trim()
    const shouldSearch = query.length >= MIN_SEARCH_QUERY_LENGTH

    cancelPendingSearch()
    clearPredictionError()
    clearListerSearchError()

    if (searchMode === "listers") {
      setListerQuery(query)
      clearListers()
      if (!shouldSearch) {
        return
      }
    } else {
      setPlaceQuery(query)
      clearPredictions()
      if (!shouldSearch) {
        void getPredictions("")
        return
      }
    }

    debouncedSearch(searchMode, query)
  }

  const handleRetryListerSearch = () => {
    if (listerQuery.length < MIN_SEARCH_QUERY_LENGTH) return
    cancelPendingSearch()
    void searchListers(listerQuery)
  }

  const handleRetryPlaceSearch = () => {
    if (placeQuery.length < MIN_SEARCH_QUERY_LENGTH) return
    cancelPendingSearch()
    void searchPlaces(placeQuery)
  }

  const handleDesktopInputChange = (value: string) => {
    searchCurrentMode(value)
    setDesktopSuggestionsOpen(value.trim().length >= MIN_SEARCH_QUERY_LENGTH)
  }

  const handleMobileInputChange = (value: string) => {
    searchCurrentMode(value)
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "absolute left-3 right-3 top-3 z-[60] md:left-4 md:right-auto",
        isMobileSearchOpen && "z-[100]",
      )}
    >
      <MobilePlaceSearchButton
        buttonRef={mobileSearchButtonRef}
        label={selectedPlaceName}
        onClick={handleOpenMobileSearch}
      />

      <DesktopPlaceSearchCombobox
        inputRef={inputRef}
        searchMode={searchMode}
        isSuggestionsOpen={isDesktopSuggestionsOpen}
        predictions={predictions}
        placeQuery={placeQuery}
        placeSearchError={predictionError}
        isPlaceSearchLoading={isPlaceSearchLoading}
        listers={listers}
        listerQuery={listerQuery}
        listerSearchError={listerSearchError}
        isListerSearchLoading={isListerSearchLoading}
        selectedListerIds={selectedListerIds}
        onFocus={handleDesktopFocus}
        onDismiss={closeSearchUi}
        onInputChange={handleDesktopInputChange}
        onSearch={handleSearch}
        onSearchModeChange={handleSearchModeChange}
        onRetryPlaceSearch={handleRetryPlaceSearch}
        onRetryListerSearch={handleRetryListerSearch}
        onSelectSuggestion={handleSelectSuggestion}
        onToggleLister={toggleLister}
      />

      {isMobileSearchOpen && (
        <MobilePlaceSearchOverlay
          inputRef={inputRef}
          initialValue={selectedPlaceName}
          searchMode={searchMode}
          predictions={predictions}
          placeQuery={placeQuery}
          placeSearchError={predictionError}
          isPlaceSearchLoading={isPlaceSearchLoading}
          listers={listers}
          listerQuery={listerQuery}
          listerSearchError={listerSearchError}
          isListerSearchLoading={isListerSearchLoading}
          selectedListerIds={selectedListerIds}
          onInputChange={handleMobileInputChange}
          onSearch={handleSearch}
          onSearchModeChange={handleSearchModeChange}
          onRetryPlaceSearch={handleRetryPlaceSearch}
          onRetryListerSearch={handleRetryListerSearch}
          onClose={closeSearchUi}
          onSelectSuggestion={handleSelectSuggestion}
          onToggleLister={toggleLister}
        />
      )}
    </div>
  )
})
