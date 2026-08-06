export const EXPLORE_OPPORTUNITIES_ACTION = {
  title: "Explore opportunities",
  description: "Scan for renter demand in the selected area.",
} as const

export const EXPLORE_OPPORTUNITIES_PANEL_COPY = {
  modalAriaLabel: "Explore opportunities",
  title: "Explore opportunities",
  description: "Renter demand intersecting this map area.",
  closeAriaLabel: "Close explore opportunities",
  backToListAriaLabel: "Back to opportunities",
  areaSectionTitle: "Where am I scanning?",
  areaMapEmpty: "We couldn't show this area.",
  unmatchedTab: "No matches yet",
  matchedTab: "Already matching",
  matchTabsAriaLabel: "Opportunity match filters",
  listLoading: "Loading opportunities…",
  listErrorFallback: "Could not load opportunities.",
  listRetry: "Try again",
  unmatchedEmptyTitle: "No open demand here yet",
  unmatchedEmptyDescription:
    "There are no active searches in this area without a matching building from your listings.",
  matchedEmptyTitle: "No matching opportunities",
  matchedEmptyDescription:
    "None of the active searches here already match a building you list.",
  fetchMoreError: "Could not load more opportunities.",
  endOfList: "No more opportunities",
  refreshing: "Updating opportunities…",
  refreshError: "Could not update opportunities. Showing previous results.",
  detailEmptyTitle: "Select an opportunity",
  detailEmptyDescription:
    "Choose a row from the list to inspect renter demand in this area.",
  detailLoading: "Loading opportunity…",
  detailRefreshing: "Updating opportunity…",
  detailErrorTitle: "Could not load opportunity",
  detailErrorFallback: "Something went wrong. Try again.",
  detailMobileSubtitle: "Opportunity",
} as const
