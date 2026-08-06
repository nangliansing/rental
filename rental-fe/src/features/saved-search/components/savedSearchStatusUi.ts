import type { SavedSearchStatus } from "@/features/saved-search/api"

/** User-facing status labels (API values stay Waiting / Closed). */
export const SAVED_SEARCH_STATUS_LABEL: Record<SavedSearchStatus, string> = {
  Waiting: "Active",
  Closed: "Closed",
}

export const SAVED_SEARCH_STATUS_PILLS: {
  label: string
  value: SavedSearchStatus
}[] = [
  { value: "Waiting", label: SAVED_SEARCH_STATUS_LABEL.Waiting },
  { value: "Closed", label: SAVED_SEARCH_STATUS_LABEL.Closed },
]

export const SAVED_SEARCH_STATUS_COPY: Record<
  SavedSearchStatus,
  {
    subtitle: string
    emptyTitle: string
    emptyDescription: string
  }
> = {
  Waiting: {
    subtitle: "Searches you’re watching for new matches",
    emptyTitle: "No active searches",
    emptyDescription:
      "Save a map search when nothing matches yet — it’ll show up here while you wait for listings.",
  },
  Closed: {
    subtitle: "Searches you’ve stopped watching",
    emptyTitle: "No closed searches",
    emptyDescription:
      "Closed saved searches appear here once you stop watching them.",
  },
}
