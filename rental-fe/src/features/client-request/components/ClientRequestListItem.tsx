import { memo } from "react"

import { cn } from "@/lib/utils"
import { Avatar } from "@/shared/components/data-display/Avatar"

type ClientRequestListItemProps = {
  id: string
  name: string
  preview: string
  timestamp: string
  selected: boolean
  onSelect: (id: string) => void
}

function ClientRequestListItemComponent({
  id,
  name,
  preview,
  timestamp,
  selected,
  onSelect,
}: ClientRequestListItemProps) {
  return (
    <button
      type="button"
      className={cn(
        "grid w-full grid-cols-[36px_minmax(0,1fr)] gap-3 px-3 py-3 text-left transition-colors",
        selected ? "bg-slate-100" : "bg-white hover:bg-slate-50",
      )}
      aria-selected={selected}
      onClick={() => onSelect(id)}
    >
      <Avatar displayName={name} size="sm" className="pointer-events-none" />

      <span className="min-w-0">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold text-slate-950">
            {name}
          </span>
          <span className="shrink-0 text-[11px] font-medium text-slate-500">
            {timestamp}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-xs leading-5 text-slate-500">
          {preview}
        </span>
      </span>
    </button>
  )
}

export const ClientRequestListItem = memo(ClientRequestListItemComponent)
