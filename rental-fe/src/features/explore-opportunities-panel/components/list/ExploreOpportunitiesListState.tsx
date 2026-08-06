import type { ReactNode, RefObject } from "react"

import { Button } from "@/components/ui/button"
import { InfiniteScrollSentinel } from "@/shared/components/feedback/InfiniteScrollSentinel"
import { LoaderIcon } from "@/shared/components/feedback/LoaderIcon"

import { EXPLORE_OPPORTUNITIES_PANEL_COPY } from "../../copy"

function ExploreOpportunitiesListLoading() {
  return (
    <div className="flex min-h-48 items-center justify-center">
      <div className="text-center">
        <LoaderIcon className="mx-auto h-6 w-6 text-slate-400" />
        <p className="mt-3 text-sm font-medium text-slate-600">
          {EXPLORE_OPPORTUNITIES_PANEL_COPY.listLoading}
        </p>
      </div>
    </div>
  )
}

function ExploreOpportunitiesListError({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="m-3 rounded-lg border border-red-100 bg-red-50 p-4">
      <p className="text-sm font-medium text-red-700">{message}</p>
      <Button
        type="button"
        variant="outline"
        className="mt-3"
        onClick={onRetry}
      >
        {EXPLORE_OPPORTUNITIES_PANEL_COPY.listRetry}
      </Button>
    </div>
  )
}

function ExploreOpportunitiesListEmpty({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="m-3 rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  )
}

type ExploreOpportunitiesListStateProps = {
  isLoading: boolean
  error: unknown
  isEmpty: boolean
  emptyTitle: string
  emptyDescription: string
  onRetry: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isFetchNextPageError?: boolean
  onFetchNextPage: () => void
  rootRef?: RefObject<HTMLElement | null>
  children: ReactNode
}

export function ExploreOpportunitiesListState({
  isLoading,
  error,
  isEmpty,
  emptyTitle,
  emptyDescription,
  onRetry,
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError,
  onFetchNextPage,
  rootRef,
  children,
}: ExploreOpportunitiesListStateProps) {
  if (isLoading) return <ExploreOpportunitiesListLoading />

  if (error) {
    return (
      <ExploreOpportunitiesListError
        message={
          error instanceof Error
            ? error.message
            : EXPLORE_OPPORTUNITIES_PANEL_COPY.listErrorFallback
        }
        onRetry={onRetry}
      />
    )
  }

  if (isEmpty) {
    return (
      <ExploreOpportunitiesListEmpty
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  return (
    <div>
      {children}
      <InfiniteScrollSentinel
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        isFetchNextPageError={isFetchNextPageError}
        errorMessage={EXPLORE_OPPORTUNITIES_PANEL_COPY.fetchMoreError}
        onFetchNextPage={onFetchNextPage}
        rootRef={rootRef}
        endMessage={EXPLORE_OPPORTUNITIES_PANEL_COPY.endOfList}
      />
    </div>
  )
}
