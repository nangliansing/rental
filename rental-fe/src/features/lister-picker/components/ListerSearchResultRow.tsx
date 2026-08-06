import { Check, Plus } from "lucide-react"
import { Link } from "react-router-dom"

import type { SearchAgentProfile } from "@/features/agent/api/searchAgentProfiles"
import { ListerSearchResultDetails } from "@/features/agent/components/ListerSearchResultDetails"
import { cn } from "@/lib/utils"
import { Avatar } from "@/shared/components/data-display/Avatar"

type ListerSearchResultRowProps = {
  lister: SearchAgentProfile
  isSelected: boolean
  currentUserAgentProfileId?: string | null
  onToggle: (lister: SearchAgentProfile) => void
}

export function ListerSearchResultRow({
  lister,
  isSelected,
  currentUserAgentProfileId = null,
  onToggle,
}: ListerSearchResultRowProps) {
  const displayName = lister.displayName ?? "Lister"
  const profilePath =
    lister._id === currentUserAgentProfileId
      ? "/profile"
      : `/listers/${lister._id}`

  return (
    <div className="flex w-full items-start gap-3 rounded-xl bg-white px-3 py-3 text-left hover:bg-slate-50">
      <Link
        to={profilePath}
        className="flex min-w-0 flex-1 items-start gap-3"
      >
        <Avatar
          displayName={lister.displayName}
          photo={lister.profilePhoto}
          colorKey={lister._id}
          size="sm"
          className="mt-0.5 h-10 w-10"
        />

        <ListerSearchResultDetails lister={lister} />
      </Link>

      <button
        type="button"
        className={cn(
          "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors",
          isSelected
            ? "bg-slate-950 text-white ring-4 ring-slate-100 hover:bg-slate-800"
            : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-950",
        )}
        aria-label={isSelected ? `Remove ${displayName}` : `Select ${displayName}`}
        aria-pressed={isSelected}
        onClick={() => onToggle(lister)}
      >
        {isSelected ? (
          <Check className="h-4 w-4" strokeWidth={2.75} />
        ) : (
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        )}
      </button>
    </div>
  )
}
