import type React from "react"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { SearchAgentProfile } from "@/features/agent"

import type { PlacePrediction } from "../../hooks/usePlaceSearch"
import { useTypeaheadKeyboardNavigation } from "../../hooks/useTypeaheadKeyboardNavigation"
import { ListerSuggestionList } from "./ListerSuggestionList"
import { PlaceSuggestionList } from "./PlaceSuggestionList"
import { SearchModeTabs, type SearchMode } from "./SearchModeTabs"

type DesktopPlaceSearchComboboxProps = {
  inputRef: React.RefObject<HTMLInputElement | null>
  searchMode: SearchMode
  isSuggestionsOpen: boolean
  predictions: PlacePrediction[]
  placeQuery: string
  placeSearchError: string | null
  isPlaceSearchLoading: boolean
  listers: SearchAgentProfile[]
  listerQuery: string
  listerSearchError: string | null
  isListerSearchLoading: boolean
  selectedListerIds: string[]
  onFocus: () => void
  onDismiss: () => void
  onInputChange: (value: string) => void
  onSearch: () => void
  onSearchModeChange: (mode: SearchMode) => void
  onRetryPlaceSearch: () => void
  onRetryListerSearch: () => void
  onSelectSuggestion: (prediction: PlacePrediction) => void
  onToggleLister: (lister: SearchAgentProfile) => void
}

export function DesktopPlaceSearchCombobox({
  inputRef,
  searchMode,
  isSuggestionsOpen,
  predictions,
  placeQuery,
  placeSearchError,
  isPlaceSearchLoading,
  listers,
  listerQuery,
  listerSearchError,
  isListerSearchLoading,
  selectedListerIds,
  onFocus,
  onDismiss,
  onInputChange,
  onSearch,
  onSearchModeChange,
  onRetryPlaceSearch,
  onRetryListerSearch,
  onSelectSuggestion,
  onToggleLister,
}: DesktopPlaceSearchComboboxProps) {
  const shouldShowSuggestions = isSuggestionsOpen
  const listboxId = "desktop-typeahead-listbox"
  const optionIdPrefix = "desktop-typeahead-option"
  const itemCount = searchMode === "places" ? predictions.length : listers.length
  const { activeIndex, onKeyDown } = useTypeaheadKeyboardNavigation({
    itemCount,
    resetKey: searchMode,
    onDismiss,
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

  return (
    <div className="hidden md:block md:w-[min(520px,calc(100vw-2rem))] lg:w-[520px]">
      <div className="flex items-center gap-2 rounded-full bg-white p-2 shadow-lg">
        <Input
          id="desktop-place-search"
          name="placeSearch"
          ref={inputRef}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={shouldShowSuggestions}
          aria-controls={listboxId}
          aria-activedescendant={
            activeIndex >= 0 ? `${optionIdPrefix}-${activeIndex}` : undefined
          }
          className="border-none focus-visible:ring-0"
          placeholder={
            searchMode === "places"
              ? "Search place, mall, BTS, university"
              : "Search lister name"
          }
          onFocus={onFocus}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={onKeyDown}
        />

        <Button
          size="icon"
          variant="ghost"
          onClick={onSearch}
          aria-label={searchMode === "places" ? "Search place" : "Search lister"}
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>

      {shouldShowSuggestions && (
        <div className="mt-2 overflow-hidden rounded-lg bg-white text-slate-950 shadow-lg">
          <SearchModeTabs value={searchMode} onChange={onSearchModeChange} />

          <div id={listboxId} role="listbox" className="p-2">
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
      )}
    </div>
  )
}
