import type { RefObject } from "react"
import { Check, Plus } from "lucide-react"
import { Link } from "react-router-dom"

import type { SearchAgentProfile } from "@/features/agent"
import { ListerSearchResultDetails } from "@/features/agent/components/ListerSearchResultDetails"
import { cn } from "@/lib/utils"
import { Avatar } from "@/shared/components/data-display/Avatar"
import { InfiniteScrollSentinel } from "@/shared/components/feedback/InfiniteScrollSentinel"

import { useMapSearchPlace } from "../../context/MapSearchSessionContext"
import { MIN_SEARCH_QUERY_LENGTH } from "./search.constants"
import { TypeaheadStatus } from "./TypeaheadStatus"

type ListerSuggestionListProps = {
  listers: SearchAgentProfile[]
  error?: string | null
  isLoading?: boolean
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  activeIndex?: number
  optionIdPrefix?: string
  query: string
  selectedListerIds?: string[]
  scrollRootRef?: RefObject<HTMLElement | null>
  onRetry?: () => void
  onFetchNextPage?: () => void
  onToggle: (lister: SearchAgentProfile) => void
}

export function ListerSuggestionList({
  listers,
  error = null,
  isLoading = false,
  hasNextPage = false,
  isFetchingNextPage = false,
  activeIndex = -1,
  optionIdPrefix = "lister-option",
  query,
  selectedListerIds = [],
  scrollRootRef,
  onRetry,
  onFetchNextPage,
  onToggle,
}: ListerSuggestionListProps) {
  const { currentAgentProfileId } = useMapSearchPlace()

  if (query.trim().length < MIN_SEARCH_QUERY_LENGTH) {
    return (
      <TypeaheadStatus>
        Type at least {MIN_SEARCH_QUERY_LENGTH} characters to find a lister.
      </TypeaheadStatus>
    )
  }

  if (isLoading) {
    return <TypeaheadStatus>Searching listers...</TypeaheadStatus>
  }

  if (error) {
    return (
      <div
        className="px-3 py-6 text-center text-sm text-slate-600"
        role="alert"
      >
        <p>{error}</p>
        {onRetry && (
          <button
            type="button"
            className="mt-2 font-medium text-slate-950 underline underline-offset-4"
            onClick={onRetry}
          >
            Try again
          </button>
        )}
      </div>
    )
  }

  if (listers.length === 0) {
    return <TypeaheadStatus>No listers found.</TypeaheadStatus>
  }

  return (
    <div>
      <TypeaheadStatus visuallyHidden>
        {listers.length} {listers.length === 1 ? "lister" : "listers"} found.
      </TypeaheadStatus>
      {listers.map((lister, index) => {
        const isSelected = selectedListerIds.includes(lister._id)
        const displayName = lister.displayName ?? "Lister"
        const profilePath =
          lister._id === currentAgentProfileId
            ? "/profile"
            : `/listers/${lister._id}`

        return (
          <div
            key={lister._id}
            id={`${optionIdPrefix}-${index}`}
            role="option"
            aria-selected={activeIndex === index}
            className="flex w-full items-start gap-3 bg-white px-3 py-3 text-left hover:bg-slate-100"
          >
            <Link
              to={profilePath}
              className="flex min-w-0 flex-1 items-start gap-3"
            >
              <Avatar
                displayName={lister.displayName}
                photo={lister.profilePhoto}
                colorKey={lister._id}
                size="sm"
                className="mt-0.5 h-10 w-10"
              />

              <ListerSearchResultDetails lister={lister} />
            </Link>

            <button
              type="button"
              className={cn(
                "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                isSelected
                  ? "bg-slate-950 text-white ring-4 ring-slate-100 hover:bg-slate-800"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-950",
              )}
              aria-label={
                isSelected
                  ? `Remove ${displayName} from search`
                  : `Add ${displayName} to search`
              }
              onClick={() => onToggle(lister)}
            >
              {isSelected ? (
                <Check className="h-4 w-4" strokeWidth={2.75} />
              ) : (
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              )}
            </button>
          </div>
        )
      })}

      {onFetchNextPage ? (
        <InfiniteScrollSentinel
          rootRef={scrollRootRef}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onFetchNextPage={onFetchNextPage}
          endMessage="No more listers"
          errorMessage="Could not load more listers."
        />
      ) : null}
    </div>
  )
}
