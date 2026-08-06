import type { SyntheticEvent } from "react"
import { X } from "lucide-react"

import type { SearchAgentProfile } from "@/features/agent"
import { cn } from "@/lib/utils"
import { Avatar } from "@/shared/components/data-display/Avatar"

type SelectedListersRailProps = {
  listers: SearchAgentProfile[]
  onRemove: (listerId: string) => void
  className?: string
  /** Defaults to “Remove {name}”. */
  removeAriaLabel?: (displayName: string) => string
  /**
   * Stops parent drag/gesture handlers (e.g. map results panel) when interacting
   * with the horizontal scroll rail.
   */
  onInteractionStart?: (event: SyntheticEvent) => void
}

/** Horizontally scrollable chips for currently selected listers. */
export function SelectedListersRail({
  listers,
  onRemove,
  className,
  removeAriaLabel = (displayName) => `Remove ${displayName}`,
  onInteractionStart,
}: SelectedListersRailProps) {
  if (listers.length === 0) return null

  return (
    <div
      className={cn(
        "overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="list"
      aria-label="Selected listers"
      onPointerDown={onInteractionStart}
      onMouseDown={onInteractionStart}
      onTouchStart={onInteractionStart}
    >
      <div className="flex w-max min-w-full gap-2 px-3">
        {listers.map((lister) => {
          const displayName = lister.displayName ?? "Lister"

          return (
            <div
              key={lister._id}
              role="listitem"
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white py-0.5 pl-0.5 pr-1 shadow-sm"
              title={displayName}
            >
              <Avatar
                displayName={lister.displayName}
                photo={lister.profilePhoto}
                colorKey={lister._id}
                size="xs"
              />

              <span className="max-w-[9rem] truncate text-xs font-semibold text-slate-700">
                {displayName}
              </span>

              <button
                type="button"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                aria-label={removeAriaLabel(displayName)}
                onClick={(event) => {
                  event.stopPropagation()
                  onRemove(lister._id)
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
