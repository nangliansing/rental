import type { SavedSearchStatus } from "@/features/saved-search/api"
import { cn } from "@/lib/utils"

import { getSavedSearchStatusBadgeClassName } from "./savedSearchDetailDisplay"
import { SAVED_SEARCH_STATUS_LABEL } from "./savedSearchStatusUi"

type SavedSearchStatusBadgeProps = {
  status: SavedSearchStatus
  className?: string
}

export function SavedSearchStatusBadge({
  status,
  className,
}: SavedSearchStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-semibold",
        getSavedSearchStatusBadgeClassName(status),
        className,
      )}
    >
      {SAVED_SEARCH_STATUS_LABEL[status]}
    </span>
  )
}
