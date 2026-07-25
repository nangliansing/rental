import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { InfiniteScrollSentinel } from "@/shared/components/feedback/InfiniteScrollSentinel"

export function AdminEmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  )
}

export function AdminListLoading() {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-lg bg-slate-50">
      <div className="text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
        <p className="mt-3 text-sm font-medium text-slate-600">
          Loading submissions...
        </p>
      </div>
    </div>
  )
}

export function AdminErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="rounded-lg border border-red-100 bg-red-50 p-4">
      <p className="text-sm font-medium text-red-700">{message}</p>
      <Button
        type="button"
        variant="outline"
        className="mt-3"
        onClick={onRetry}
      >
        Try again
      </Button>
    </div>
  )
}

export function AdminListState({
  isLoading,
  error,
  errorFallback,
  isEmpty,
  emptyTitle,
  emptyDescription,
  onRetry,
  hasNextPage,
  isFetchingNextPage,
  onFetchNextPage,
  children,
}: {
  isLoading: boolean
  error: unknown
  errorFallback: string
  isEmpty: boolean
  emptyTitle: string
  emptyDescription: string
  onRetry: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onFetchNextPage: () => void
  children: ReactNode
}) {
  if (isLoading) return <AdminListLoading />

  if (error) {
    return (
      <AdminErrorState
        message={error instanceof Error ? error.message : errorFallback}
        onRetry={onRetry}
      />
    )
  }

  if (isEmpty) {
    return (
      <AdminEmptyState title={emptyTitle} description={emptyDescription} />
    )
  }

  return (
    <div className="space-y-2 pb-4">
      {children}
      <InfiniteScrollSentinel
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onFetchNextPage={onFetchNextPage}
        endMessage="No more items"
      />
    </div>
  )
}
