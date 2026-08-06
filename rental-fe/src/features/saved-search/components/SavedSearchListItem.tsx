import { memo } from "react"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"

import { formatCappedSavedSearchMatchingTotal } from "./formatSavedSearchListMeta"

type SavedSearchListItemProps = {
  id: string
  name: string
  preview: string
  timestamp: string
  myMatchingBuildingCount?: number | null
  platformMatchingBuildingCount?: number | null
  matchingBuildingCountCapped?: boolean
  selected: boolean
  onSelect: (id: string) => void
}

function SavedSearchListItemComponent({
  id,
  name,
  preview,
  timestamp,
  myMatchingBuildingCount,
  platformMatchingBuildingCount,
  matchingBuildingCountCapped = false,
  selected,
  onSelect,
}: SavedSearchListItemProps) {
  const hasMatchingCounts =
    myMatchingBuildingCount != null &&
    platformMatchingBuildingCount != null

  return (
    <button
      type="button"
      className={cn(
        "grid w-full grid-cols-[36px_minmax(0,1fr)_auto] gap-x-3 px-3 py-3 text-left transition-colors",
        selected ? "bg-slate-100" : "bg-white hover:bg-slate-50",
      )}
      aria-selected={selected}
      onClick={() => onSelect(id)}
    >
      <span
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-full bg-slate-100 text-slate-600 ring-1 ring-black/5"
        aria-hidden="true"
      >
        <Search className="h-4 w-4" strokeWidth={2.25} />
      </span>

      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-slate-950">
          {name}
        </span>
        <span className="mt-0.5 block truncate text-xs leading-5 text-slate-500">
          {preview}
        </span>
        {hasMatchingCounts ? (
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold tabular-nums">
            <span
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 ring-1 ring-inset ring-blue-100"
              aria-label={`${myMatchingBuildingCount} matching buildings from your listings`}
            >
              <span className="font-medium text-blue-600">Yours</span>
              {myMatchingBuildingCount}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700 ring-1 ring-inset ring-slate-200"
              aria-label={`${platformMatchingBuildingCount} matching buildings from platform listings`}
            >
              <span className="font-medium text-slate-500">Platform</span>
              {platformMatchingBuildingCount}
            </span>
            {matchingBuildingCountCapped ? (
              <span
                className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 ring-1 ring-inset ring-amber-200"
                aria-label="Matching-building counts are capped; at least 20 buildings match"
                title="Counts show the first 20 matching buildings; more matches exist."
              >
                {formatCappedSavedSearchMatchingTotal(
                  myMatchingBuildingCount,
                  platformMatchingBuildingCount,
                )}
              </span>
            ) : null}
          </span>
        ) : null}
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
        <span className="text-[11px] font-medium leading-none text-slate-500">
          {timestamp}
        </span>
      </span>
    </button>
  )
}

export const SavedSearchListItem = memo(SavedSearchListItemComponent)
