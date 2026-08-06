import type { RefObject } from "react"
import { Building2, TriangleAlert } from "lucide-react"

import type { SearchAgentProfile } from "@/features/agent"
import { Button } from "@/components/ui/button"
import { InfiniteScrollSentinel } from "@/shared/components/feedback/InfiniteScrollSentinel"
import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"

import { ListerSearchResultRow } from "./ListerSearchResultRow"

type ListerSearchResultsListProps = {
  listers: SearchAgentProfile[]
  selectedListerIds: string[]
  query: string
  minQueryLength: number
  isLoading?: boolean
  isError?: boolean
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  currentUserAgentProfileId?: string | null
  scrollRootRef?: RefObject<HTMLElement | null>
  onToggleLister: (lister: SearchAgentProfile) => void
  onFetchNextPage?: () => void
  onRetry?: () => void
}

export function ListerSearchResultsList({
  listers,
  selectedListerIds,
  query,
  minQueryLength,
  isLoading = false,
  isError = false,
  hasNextPage = false,
  isFetchingNextPage = false,
  currentUserAgentProfileId = null,
  scrollRootRef,
  onToggleLister,
  onFetchNextPage,
  onRetry,
}: ListerSearchResultsListProps) {
  const trimmedQuery = query.trim()

  if (trimmedQuery.length < minQueryLength) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Building2 className="mb-3 h-6 w-6 text-slate-400" />
        <p className="text-sm font-semibold text-slate-950">Search for listers</p>
        <p className="mt-1 max-w-[260px] text-sm text-slate-500">
          Type at least {minQueryLength} characters to find listers by name.
        </p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div
        className="flex flex-col items-center justify-center py-10 text-center"
        role="status"
      >
        <LoaderIcon className="mb-3 h-6 w-6 text-slate-400" />
        <p className="text-sm font-semibold text-slate-950">Searching listers…</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className="flex flex-col items-center justify-center py-10 text-center"
        role="alert"
      >
        <TriangleAlert className="mb-3 h-6 w-6 text-red-400" />
        <p className="text-sm font-semibold text-slate-950">
          Could not search listers
        </p>
        <p className="mt-1 max-w-[260px] text-sm text-slate-500">
          Please try again in a moment.
        </p>
        {onRetry ? (
          <Button
            type="button"
            className="mt-4 h-10 rounded-full px-4"
            onClick={onRetry}
          >
            Retry search
          </Button>
        ) : null}
      </div>
    )
  }

  if (listers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Building2 className="mb-3 h-6 w-6 text-slate-400" />
        <p className="text-sm font-semibold text-slate-950">No listers found</p>
        <p className="mt-1 max-w-[260px] text-sm text-slate-500">
          Try a different name spelling.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-0 space-y-1">
      <div role="list" aria-label="Lister search results" className="space-y-1">
        {listers.map((lister) => (
          <div key={lister._id} role="listitem">
            <ListerSearchResultRow
              lister={lister}
              isSelected={selectedListerIds.includes(lister._id)}
              currentUserAgentProfileId={currentUserAgentProfileId}
              onToggle={onToggleLister}
            />
          </div>
        ))}
      </div>

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
