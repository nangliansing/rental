import { useEffect, useRef } from "react"
import type React from "react"
import { ChevronLeft, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { SearchAgentProfile } from "@/features/agent"
import { SelectedListersRail } from "@/features/lister-picker"

import type { PlacePrediction } from "../../hooks/usePlaceSearch"
import { useTypeaheadKeyboardNavigation } from "@/shared/hooks/useTypeaheadKeyboardNavigation"
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
  hasMoreListers?: boolean
  isFetchingMoreListers?: boolean
  selectedListers: SearchAgentProfile[]
  selectedListerIds: string[]
  onClose: () => void
  onInputChange: (value: string) => void
  onSearch: () => void
  onSearchModeChange: (mode: SearchMode) => void
  onRetryPlaceSearch: () => void
  onRetryListerSearch: () => void
  onFetchMoreListers?: () => void
  onSelectSuggestion: (prediction: PlacePrediction) => void
  onToggleLister: (lister: SearchAgentProfile) => void
  onRemoveLister: (listerId: string) => void
}

export function formatMobileListerOverlayDismissLabel(
  selectedCount: number,
): string {
  if (selectedCount <= 0) return "Done"
  if (selectedCount === 1) return "Add 1 lister to filters"
  return `Add ${selectedCount} listers to filters`
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
  hasMoreListers = false,
  isFetchingMoreListers = false,
  selectedListers,
  selectedListerIds,
  onClose,
  onInputChange,
  onSearch,
  onSearchModeChange,
  onRetryPlaceSearch,
  onRetryListerSearch,
  onFetchMoreListers,
  onSelectSuggestion,
  onToggleLister,
  onRemoveLister,
}: MobilePlaceSearchOverlayProps) {
  const listScrollRef = useRef<HTMLDivElement | null>(null)
  const listboxId = "mobile-typeahead-listbox"
  const optionIdPrefix = "mobile-typeahead-option"
  const isListersMode = searchMode === "listers"
  const itemCount = searchMode === "places" ? predictions.length : listers.length
  const dismissLabel = formatMobileListerOverlayDismissLabel(
    selectedListers.length,
  )
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
    <div className="fixed inset-0 z-[80] flex flex-col bg-white text-slate-950 md:hidden">
      <div className="flex shrink-0 items-center gap-1 px-3 pt-3">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 p-0"
          onClick={onClose}
          aria-label="Back"
        >
          <ChevronLeft className="size-7 stroke-[2.75]" />
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

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <SearchModeTabs value={searchMode} onChange={onSearchModeChange} />

        <SelectedListersRail
          listers={selectedListers}
          onRemove={onRemoveLister}
          className="mt-3 shrink-0"
          removeAriaLabel={(displayName) =>
            `Remove ${displayName} from search`
          }
        />

        <div
          ref={listScrollRef}
          id={listboxId}
          role="listbox"
          className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2"
        >
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
              hasNextPage={hasMoreListers}
              isFetchingNextPage={isFetchingMoreListers}
              selectedListerIds={selectedListerIds}
              scrollRootRef={listScrollRef}
              onRetry={onRetryListerSearch}
              onFetchNextPage={onFetchMoreListers}
              onToggle={onToggleLister}
            />
          )}
        </div>
      </div>

      {isListersMode ? (
        <div className="shrink-0 border-t border-slate-100 bg-white px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            className="h-12 w-full rounded-full text-base font-semibold"
            onClick={onClose}
          >
            {dismissLabel}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
