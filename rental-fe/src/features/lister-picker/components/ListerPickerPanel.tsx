import { useMemo, useRef, useState } from "react"

import {
  ListerAutocomplete,
  LISTER_AUTOCOMPLETE_MIN_QUERY_LENGTH,
  type SearchAgentProfile,
} from "@/features/agent"
import { cn } from "@/lib/utils"

import { useListerPickerSearch } from "../hooks/useListerPickerSearch"
import { ListerSearchResultsList } from "./ListerSearchResultsList"
import { SelectedListersRail } from "./SelectedListersRail"

export type ListerPickerPanelProps = {
  selectedListers: SearchAgentProfile[]
  onToggleLister: (lister: SearchAgentProfile) => void
  onRemoveLister: (listerId: string) => void
  currentUserAgentProfileId?: string | null
  className?: string
  /** Applied to non-scrolling chrome + list content (keeps scrollbar flush to edges). */
  contentClassName?: string
  autocompletePlaceholder?: string
}

/**
 * Reusable lister picker:
 * search field (no floating dropdown) → selected chips → search results list.
 *
 * Selection is controlled by the parent (wizard draft / map filters).
 * Horizontal padding belongs on content, not the scrollport, so the thumb stays
 * flush with the panel edges.
 */
export function ListerPickerPanel({
  selectedListers,
  onToggleLister,
  onRemoveLister,
  currentUserAgentProfileId = null,
  className,
  contentClassName = "px-5",
  autocompletePlaceholder = "Search lister name",
}: ListerPickerPanelProps) {
  const scrollRootRef = useRef<HTMLDivElement | null>(null)
  const [inputValue, setInputValue] = useState("")
  const selectedListerIds = useMemo(
    () => selectedListers.map((lister) => lister._id),
    [selectedListers],
  )

  const {
    listers,
    isLoading,
    isError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useListerPickerSearch({ query: inputValue })

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className={cn("shrink-0 space-y-3", contentClassName)}>
        <ListerAutocomplete
          selectedListerIds={selectedListerIds}
          currentUserAgentProfileId={currentUserAgentProfileId}
          placeholder={autocompletePlaceholder}
          showSuggestions={false}
          onToggleLister={onToggleLister}
          onInputValueChange={setInputValue}
        />

        <SelectedListersRail
          listers={selectedListers}
          onRemove={onRemoveLister}
        />
      </div>

      <div
        ref={scrollRootRef}
        className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <div className={contentClassName}>
          <ListerSearchResultsList
            listers={listers}
            selectedListerIds={selectedListerIds}
            query={inputValue}
            minQueryLength={LISTER_AUTOCOMPLETE_MIN_QUERY_LENGTH}
            isLoading={isLoading}
            isError={isError}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            currentUserAgentProfileId={currentUserAgentProfileId}
            scrollRootRef={scrollRootRef}
            onToggleLister={onToggleLister}
            onFetchNextPage={fetchNextPage}
            onRetry={refetch}
          />
        </div>
      </div>
    </div>
  )
}
