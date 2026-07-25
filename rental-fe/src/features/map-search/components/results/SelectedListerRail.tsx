import { X } from "lucide-react"

import type { SearchAgentProfile } from "@/features/agent"
import { Avatar } from "@/shared/components/data-display/Avatar"

type SelectedListerRailProps = {
  listers: SearchAgentProfile[]
  onRemove: (listerId: string) => void
}

export function SelectedListerRail({
  listers,
  onRemove,
}: SelectedListerRailProps) {
  if (listers.length === 0) return null

  const stopPanelDrag = (event: React.SyntheticEvent) => {
    event.stopPropagation()
  }

  return (
    <div
      className="flex min-w-0 flex-1 gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      onPointerDown={stopPanelDrag}
      onMouseDown={stopPanelDrag}
      onTouchStart={stopPanelDrag}
    >
      {listers.map((lister) => (
        <div
          key={lister._id}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white py-0.5 pl-0.5 pr-1 shadow-sm"
          title={lister.displayName ?? "Lister"}
        >
          <Avatar
            displayName={lister.displayName}
            photo={lister.profilePhoto}
            colorKey={lister._id}
            size="xs"
          />

          <span className="max-w-[112px] truncate text-xs font-semibold text-slate-700">
            {lister.displayName ?? "Lister"}
          </span>

          <button
            type="button"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-950"
            aria-label={`Remove ${lister.displayName ?? "lister"} from search`}
            onClick={(event) => {
              event.stopPropagation()
              onRemove(lister._id)
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
