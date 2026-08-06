/** Copy for the map Plus menu + save-search create wizard. */

export const MAP_ACTIONS_TRIGGER = {
  ariaLabel: "Map actions",
  tooltip: "Map actions",
  menuAriaLabel: "Map actions",
} as const

export const MAP_LISTING_MODE_ACTION = {
  enterTitle: "Enter listing mode",
  enterDescription: "Find buildings to list a room.",
  exitTitle: "Exit listing mode",
  exitDescription: "Return to normal map search.",
  requiresProfileDescription:
    "Set up a lister profile to list rooms from the map.",
} as const

export const MAP_SAVE_SEARCH_ACTION = {
  title: "Save this search",
  description: "Watch this pin, line, or map area for matching buildings.",
  /** Empty results CTA — same action, shorter supporting line. */
  emptyStateDescription:
    "We'll watch this area and filters for matching buildings.",
} as const

export const CREATE_SAVED_SEARCH_COPY = {
  detailsTitle: "Save search",
  detailsDescription: "Confirm the search area, then name it.",
  preferencesTitle: "Preferences",
  preferencesDescription:
    "Optional filters used when matching buildings to this search.",
  listersTitle: "Preferred listers",
  listersDescription:
    "Optionally limit matches to listings from selected listers.",
  closeAriaLabel: "Close save search",
  successToastTitle: "Search saved",
  createLabel: "Save search",
  creatingLabel: "Saving…",
} as const
