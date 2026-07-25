import type { ReactNode } from "react"

import { AdminErrorState, AdminListLoading } from "./AdminListState"

export function AdminDetailState({
  isLoading,
  shouldShowLoading,
  error,
  errorFallback,
  onRetry,
  children,
}: {
  isLoading: boolean
  shouldShowLoading: boolean
  error: unknown
  errorFallback: string
  onRetry: () => void
  children: ReactNode
}) {
  if (isLoading && shouldShowLoading) return <AdminListLoading />

  if (error) {
    return (
      <AdminErrorState
        message={error instanceof Error ? error.message : errorFallback}
        onRetry={onRetry}
      />
    )
  }

  return <>{children}</>
}
