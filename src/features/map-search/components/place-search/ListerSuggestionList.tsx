import { BadgeCheck, Check, Languages, Plus, UserRound } from "lucide-react"
import { Link } from "react-router-dom"

import type { SearchAgentProfile } from "@/features/agent"
import { cn } from "@/lib/utils"
import { Avatar } from "@/shared/components/data-display/Avatar"
import { useMapSearchPlace } from "../../context/MapSearchSessionContext"
import { MIN_SEARCH_QUERY_LENGTH } from "./search.constants"
import { TypeaheadStatus } from "./TypeaheadStatus"

type ListerSuggestionListProps = {
  listers: SearchAgentProfile[]
  error?: string | null
  isLoading?: boolean
  activeIndex?: number
  optionIdPrefix?: string
  query: string
  selectedListerIds?: string[]
  onRetry?: () => void
  onToggle: (lister: SearchAgentProfile) => void
}

export function ListerSuggestionList({
  listers,
  error = null,
  isLoading = false,
  activeIndex = -1,
  optionIdPrefix = "lister-option",
  query,
  selectedListerIds = [],
  onRetry,
  onToggle,
}: ListerSuggestionListProps) {
  const { currentAgentProfileId } = useMapSearchPlace()

  if (query.trim().length < MIN_SEARCH_QUERY_LENGTH) {
    return (
      <TypeaheadStatus>
        Type at least {MIN_SEARCH_QUERY_LENGTH} characters to find a lister.
      </TypeaheadStatus>
    )
  }

  if (isLoading) {
    return (
      <TypeaheadStatus>Searching listers...</TypeaheadStatus>
    )
  }

  if (error) {
    return (
      <div
        className="px-3 py-6 text-center text-sm text-slate-600"
        role="alert"
      >
        <p>{error}</p>
        {onRetry && (
          <button
            type="button"
            className="mt-2 font-medium text-slate-950 underline underline-offset-4"
            onClick={onRetry}
          >
            Try again
          </button>
        )}
      </div>
    )
  }

  if (listers.length === 0) {
    return (
      <TypeaheadStatus>No listers found.</TypeaheadStatus>
    )
  }

  return (
    <div className="space-y-1">
      <TypeaheadStatus visuallyHidden>
        {listers.length} {listers.length === 1 ? "lister" : "listers"} found.
      </TypeaheadStatus>
      {listers.map((lister, index) => {
        const isSelected = selectedListerIds.includes(lister._id)
        const profilePath =
          lister._id === currentAgentProfileId
            ? "/profile"
            : `/listers/${lister._id}`

        return (
          <div
            key={lister._id}
            id={`${optionIdPrefix}-${index}`}
            role="option"
            aria-selected={activeIndex === index}
            className="flex w-full items-center gap-3 rounded-lg bg-white px-3 py-3 text-left hover:bg-slate-100"
          >
            <Link
              to={profilePath}
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <Avatar
                displayName={lister.displayName}
                photo={lister.profilePhoto}
                colorKey={lister._id}
                size="sm"
                className="h-10 w-10"
              />

              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-slate-950">
                    {lister.displayName ?? "Lister"}
                  </span>

                  {lister.isVerified && (
                    <BadgeCheck
                      className="h-4 w-4 shrink-0 fill-[#1d9bf0] text-white"
                      strokeWidth={3}
                    />
                  )}
                </span>

                <span className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-slate-500">
                  {lister.supportLanguages.length > 0 ? (
                    <>
                      <Languages className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {lister.supportLanguages.join(" · ")}
                      </span>
                    </>
                  ) : (
                    <>
                      <UserRound className="h-3.5 w-3.5 shrink-0" />
                      <span>Lister</span>
                    </>
                  )}
                </span>
              </span>
            </Link>

            <button
              type="button"
              className={cn(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                isSelected
                  ? "bg-slate-950 text-white ring-4 ring-slate-100 hover:bg-slate-800"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-950",
              )}
              aria-label={
                isSelected
                  ? `Remove ${lister.displayName ?? "lister"} from search`
                  : `Add ${lister.displayName ?? "lister"} to search`
              }
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
      })}
    </div>
  )
}
