import type { ReactNode } from "react"
import { Check, Plus } from "lucide-react"
import { Link } from "react-router-dom"

import type { SearchAgentProfile } from "@/features/agent/api/searchAgentProfiles"
import { cn } from "@/lib/utils"
import { Avatar } from "@/shared/components/data-display/Avatar"

import { LISTER_AUTOCOMPLETE_MIN_QUERY_LENGTH } from "../lister-autocomplete/constants"
import { ListerSearchResultDetails } from "./ListerSearchResultDetails"

type ListerAutocompleteSuggestionsProps = {
  listers: SearchAgentProfile[]
  query: string
  error?: string | null
  isLoading?: boolean
  activeIndex?: number
  optionIdPrefix?: string
  selectedListerIds?: string[]
  /** When set, that profile links to `/profile` instead of `/listers/:id`. */
  currentUserAgentProfileId?: string | null
  onRetry?: () => void
  onToggle: (lister: SearchAgentProfile) => void
}

function TypeaheadStatus({
  children,
  visuallyHidden = false,
}: {
  children: ReactNode
  visuallyHidden?: boolean
}) {
  return (
    <p
      className={cn(
        visuallyHidden
          ? "sr-only"
          : "px-3 py-6 text-center text-sm text-slate-500",
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {children}
    </p>
  )
}

export function ListerAutocompleteSuggestions({
  listers,
  query,
  error = null,
  isLoading = false,
  activeIndex = -1,
  optionIdPrefix = "lister-autocomplete-option",
  selectedListerIds = [],
  currentUserAgentProfileId = null,
  onRetry,
  onToggle,
}: ListerAutocompleteSuggestionsProps) {
  if (query.trim().length < LISTER_AUTOCOMPLETE_MIN_QUERY_LENGTH) {
    return (
      <TypeaheadStatus>
        Type at least {LISTER_AUTOCOMPLETE_MIN_QUERY_LENGTH} characters to find
        a lister.
      </TypeaheadStatus>
    )
  }

  if (isLoading) {
    return <TypeaheadStatus>Searching listers...</TypeaheadStatus>
  }

  if (error) {
    return (
      <div
        className="px-3 py-6 text-center text-sm text-slate-600"
        role="alert"
      >
        <p>{error}</p>
        {onRetry ? (
          <button
            type="button"
            className="mt-2 font-medium text-slate-950 underline underline-offset-4"
            onClick={onRetry}
          >
            Try again
          </button>
        ) : null}
      </div>
    )
  }

  if (listers.length === 0) {
    return <TypeaheadStatus>No listers found.</TypeaheadStatus>
  }

  return (
    <div className="space-y-1">
      <TypeaheadStatus visuallyHidden>
        {listers.length} {listers.length === 1 ? "lister" : "listers"} found.
      </TypeaheadStatus>
      {listers.map((lister, index) => {
        const isSelected = selectedListerIds.includes(lister._id)
        const profilePath =
          lister._id === currentUserAgentProfileId
            ? "/profile"
            : `/listers/${lister._id}`
        const displayName = lister.displayName ?? "Lister"

        return (
          <div
            key={lister._id}
            id={`${optionIdPrefix}-${index}`}
            role="option"
            aria-selected={activeIndex === index}
            className="flex w-full items-start gap-3 rounded-lg bg-white px-3 py-3 text-left hover:bg-slate-100"
          >
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
                "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                isSelected
                  ? "bg-slate-950 text-white ring-4 ring-slate-100 hover:bg-slate-800"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-950",
              )}
              aria-label={
                isSelected ? `Remove ${displayName}` : `Select ${displayName}`
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
