import { memo } from "react"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"

import { formatSavedSearchMatchingCount } from "./formatSavedSearchListMeta"

type SavedSearchListItemProps = {
  id: string
  name: string
  preview: string
  timestamp: string
  /** Buildings matching this saved search; hidden when null / undefined / 0. */
  matchingCount?: number | null
  selected: boolean
  onSelect: (id: string) => void
}

function SavedSearchListItemComponent({
  id,
  name,
  preview,
  timestamp,
  matchingCount,
  selected,
  onSelect,
}: SavedSearchListItemProps) {
  const matchingCountLabel = formatSavedSearchMatchingCount(matchingCount)

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
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
        <span className="text-[11px] font-medium leading-none text-slate-500">
          {timestamp}
        </span>
        {matchingCountLabel ? (
          <span
            className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-950 px-1.5 text-[10px] font-semibold tabular-nums tracking-tight text-white"
            aria-label={`${matchingCountLabel} matching buildings`}
          >
            {matchingCountLabel}
          </span>
        ) : null}
      </span>
    </button>
  )
}

export const SavedSearchListItem = memo(SavedSearchListItemComponent)
