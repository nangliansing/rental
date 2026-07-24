import { useEffect } from "react"
import type React from "react"
import { ChevronLeft, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { SearchAgentProfile } from "@/features/agent"

import type { PlacePrediction } from "../../hooks/usePlaceSearch"
import { useTypeaheadKeyboardNavigation } from "../../hooks/useTypeaheadKeyboardNavigation"
import { ListerSuggestionList } from "./ListerSuggestionList"
import { PlaceSuggestionList } from "./PlaceSuggestionList"
import { SearchModeTabs, type SearchMode } from "./SearchModeTabs"

type MobilePlaceSearchOverlayProps = {
  inputRef: React.RefObject<HTMLInputElement | null>
  initialValue?: string
  searchMode: SearchMode
  predictions: PlacePrediction[]
  placeQuery: string
  placeSearchError: string | null
  isPlaceSearchLoading: boolean
  listers: SearchAgentProfile[]
  listerQuery: string
  listerSearchError: string | null
  isListerSearchLoading: boolean
  selectedListerIds: string[]
  onClose: () => void
  onInputChange: (value: string) => void
  onSearch: () => void
  onSearchModeChange: (mode: SearchMode) => void
  onRetryPlaceSearch: () => void
  onRetryListerSearch: () => void
  onSelectSuggestion: (prediction: PlacePrediction) => void
  onToggleLister: (lister: SearchAgentProfile) => void
}

export function MobilePlaceSearchOverlay({
  inputRef,
  initialValue,
  searchMode,
  predictions,
  placeQuery,
  placeSearchError,
  isPlaceSearchLoading,
  listers,
  listerQuery,
  listerSearchError,
  isListerSearchLoading,
  selectedListerIds,
  onClose,
  onInputChange,
  onSearch,
  onSearchModeChange,
  onRetryPlaceSearch,
  onRetryListerSearch,
  onSelectSuggestion,
  onToggleLister,
}: MobilePlaceSearchOverlayProps) {
  const listboxId = "mobile-typeahead-listbox"
  const optionIdPrefix = "mobile-typeahead-option"
  const itemCount = searchMode === "places" ? predictions.length : listers.length
  const { activeIndex, onKeyDown } = useTypeaheadKeyboardNavigation({
    itemCount,
    resetKey: searchMode,
    onDismiss: onClose,
    onSubmit: onSearch,
    onSelect: (index) => {
      if (searchMode === "places") {
        const prediction = predictions[index]
        if (prediction) onSelectSuggestion(prediction)
        return
      }

      const lister = listers[index]
      if (lister) onToggleLister(lister)
    },
  })

  useEffect(() => {
    if (!inputRef.current) return

    inputRef.current.value = initialValue ?? ""
  }, [initialValue, inputRef])

  return (
    <div className="fixed inset-0 z-[80] bg-white p-3 text-slate-950 md:hidden">
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="h-12 w-12 shrink-0"
          onClick={onClose}
          aria-label="Back"
        >
          <ChevronLeft className="h-10 w-10 stroke-[3.5]" />
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border bg-white px-3 shadow-sm">
          <Search className="h-4 w-4 shrink-0 text-slate-500" />

          <Input
            id="mobile-place-search"
            name="placeSearch"
            ref={inputRef}
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-activedescendant={
              activeIndex >= 0 ? `${optionIdPrefix}-${activeIndex}` : undefined
            }
            autoFocus
            defaultValue={searchMode === "places" ? initialValue : ""}
            className="border-0 bg-white px-0 text-slate-950 shadow-none placeholder:text-slate-400 focus-visible:ring-0"
            placeholder={
              searchMode === "places"
                ? "Search place, mall, BTS"
                : "Search lister name"
            }
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
      </div>

      <div className="mt-4">
        <SearchModeTabs value={searchMode} onChange={onSearchModeChange} />

        <div id={listboxId} role="listbox" className="mt-3">
          {searchMode === "places" ? (
            <PlaceSuggestionList
              predictions={predictions}
              activeIndex={activeIndex}
              optionIdPrefix={optionIdPrefix}
              query={placeQuery}
              error={placeSearchError}
              isLoading={isPlaceSearchLoading}
              onRetry={onRetryPlaceSearch}
              onSelect={onSelectSuggestion}
            />
          ) : (
            <ListerSuggestionList
              listers={listers}
              activeIndex={activeIndex}
              optionIdPrefix={optionIdPrefix}
              query={listerQuery}
              error={listerSearchError}
              isLoading={isListerSearchLoading}
              selectedListerIds={selectedListerIds}
              onRetry={onRetryListerSearch}
              onToggle={onToggleLister}
            />
          )}
        </div>
      </div>
    </div>
  )
}
