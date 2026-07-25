import {
  Building2,
  Loader2,
  Search,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import type {
  MapSearchSource,
  MapSearchStatus,
} from "../../context/MapSearchSessionContext"
import {
  getSearchScopeListingContext,
  getSearchScopeShortLabel,
  getSearchScopeVisualPhrase,
} from "../../utils/map-search-presentation"

type SearchStateMessageProps = {
  status: MapSearchStatus
  searchSource?: MapSearchSource
  isListingSearch?: boolean
  isPendingBuildingUnresolved?: boolean
  onSearchAgain?: () => void
}

export function SearchStateMessage({
  status,
  searchSource = "area",
  isListingSearch = false,
  isPendingBuildingUnresolved = false,
  onSearchAgain,
}: SearchStateMessageProps) {
  const scope = getSearchScopeVisualPhrase(searchSource)
  const shortScope = getSearchScopeShortLabel(searchSource)
  const listingContext = getSearchScopeListingContext(searchSource)

  if (isPendingBuildingUnresolved) {
    return (
      <div
        className="flex flex-col items-center justify-center px-5 py-10 text-center"
        role="status"
      >
        <TriangleAlert className="mb-3 h-6 w-6 text-amber-500" />

        <p className="text-sm font-semibold text-slate-950">
          Building not found
        </p>

        <p className="mt-1 max-w-[260px] text-sm text-slate-500">
          This building is no longer in the current results. Try searching again
          or choose another building.
        </p>

        {onSearchAgain && (
          <Button
            className="mt-4 h-10 rounded-full px-4"
            onClick={onSearchAgain}
          >
            <Search className="mr-2 h-4 w-4" />
            Search {shortScope}
          </Button>
        )}
      </div>
    )
  }

  if (status === "loading") {
    return (
      <div
        className="flex flex-col items-center justify-center px-5 py-10 text-center"
        role="status"
      >
        <Loader2 className="mb-3 h-6 w-6 animate-spin text-slate-400" />

        <p className="text-sm font-semibold text-slate-950">
          Searching {scope}
        </p>

        <p className="mt-1 max-w-[260px] text-sm text-slate-500">
          {isListingSearch
            ? `Looking for buildings you can list under ${listingContext}`
            : `Looking for available buildings ${listingContext}`}
        </p>
      </div>
    )
  }

  if (status === "stale") {
    return (
      <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
        <SlidersHorizontal className="mb-3 h-6 w-6 text-slate-400" />

        <p className="text-sm font-semibold text-slate-950">Filters changed</p>

        <p className="mt-1 max-w-[260px] text-sm text-slate-500">
          Search {scope} again to refresh the results.
        </p>

        {onSearchAgain && (
          <Button
            className="mt-4 h-10 rounded-full px-4"
            onClick={onSearchAgain}
          >
            <Search className="mr-2 h-4 w-4" />
            Search {shortScope}
          </Button>
        )}
      </div>
    )
  }

  if (status === "empty") {
    return (
      <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
        <Building2 className="mb-3 h-6 w-6 text-slate-400" />

        <p className="text-sm font-semibold text-slate-950">
          {isListingSearch ? "No buildings found yet" : "No buildings found"}
        </p>

        <p className="mt-1 max-w-[260px] text-sm text-slate-500">
          {isListingSearch
            ? searchSource === "nearby"
              ? "Move the pin, or add a new building at this location."
              : "Try another area, or drop a pin to add a new building."
            : searchSource === "nearby"
              ? "Move the pin or try a wider area."
              : searchSource === "line"
                ? "Edit the line or try a wider search distance."
                : "Try moving the map or searching a wider area."}
        </p>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div
        className="flex flex-col items-center justify-center px-5 py-10 text-center"
        role="alert"
      >
        <TriangleAlert className="mb-3 h-6 w-6 text-red-400" />

        <p className="text-sm font-semibold text-slate-950">
          Could not search {scope}
        </p>

        <p className="mt-1 max-w-[260px] text-sm text-slate-500">
          Please try again in a moment.
        </p>

        {onSearchAgain && (
          <Button
            className="mt-4 h-10 rounded-full px-4"
            onClick={onSearchAgain}
          >
            <Search className="mr-2 h-4 w-4" />
            Retry search
          </Button>
        )}
      </div>
    )
  }

  return null
}
