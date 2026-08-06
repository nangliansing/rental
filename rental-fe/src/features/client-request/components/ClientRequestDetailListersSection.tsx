import { useEffect, useState } from "react"

import type { SearchAgentProfile } from "@/features/agent"
import { extractAgentProfileIds } from "@/features/agent/lister-map-search/extractAgentProfileIds"
import type { ClientRequestFilters } from "@/features/client-request/api"
import { Avatar } from "@/shared/components/data-display/Avatar"

import { useHydrateClientRequestSelectedListers } from "../hooks/useHydrateClientRequestSelectedListers"
import { ClientRequestDetailCollapsibleSection } from "./ClientRequestDetailCollapsibleSection"

type ClientRequestDetailListersSectionProps = {
  filters: ClientRequestFilters
}

function ReadOnlyListerChip({ lister }: { lister: SearchAgentProfile }) {
  const displayName = lister.displayName ?? "Lister"

  return (
    <span
      className="inline-flex h-9 max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white py-0.5 pl-0.5 pr-3 text-sm font-medium text-slate-950 shadow-sm"
      title={displayName}
    >
      <Avatar
        displayName={lister.displayName}
        photo={lister.profilePhoto}
        colorKey={lister._id}
        size="xs"
      />
      <span className="truncate">{displayName}</span>
    </span>
  )
}

function formatListersSummary(listerCount: number): string {
  if (listerCount <= 0) return "None set"
  if (listerCount === 1) return "1 lister"
  return `${listerCount} listers`
}

/** Read-only preferred listers for the client-request detail pane. */
export function ClientRequestDetailListersSection({
  filters,
}: ClientRequestDetailListersSectionProps) {
  const agentProfileIds = extractAgentProfileIds(filters)
  const agentProfileIdsKey = agentProfileIds.join(",")
  const [listers, setListers] = useState<SearchAgentProfile[]>([])
  const [isHydrating, setIsHydrating] = useState(agentProfileIds.length > 0)

  useEffect(() => {
    if (agentProfileIds.length === 0) {
      setListers([])
      setIsHydrating(false)
      return
    }

    setIsHydrating(true)
  }, [agentProfileIdsKey, agentProfileIds.length])

  useHydrateClientRequestSelectedListers({
    enabled: true,
    filters,
    onHydrated: (next) => {
      setListers(next)
      setIsHydrating(false)
    },
  })

  const collapsedSummary =
    agentProfileIds.length === 0
      ? "None set"
      : isHydrating
        ? "Loading…"
        : formatListersSummary(listers.length || agentProfileIds.length)

  return (
    <ClientRequestDetailCollapsibleSection
      title="Preferred listers"
      defaultOpen
      collapsedSummary={collapsedSummary}
    >
      {agentProfileIds.length === 0 ? (
        <p className="text-sm leading-6 text-slate-500">
          No preferred listers were saved with this search.
        </p>
      ) : isHydrating ? (
        <p className="text-sm leading-6 text-slate-500" aria-live="polite">
          Loading listers…
        </p>
      ) : listers.length === 0 ? (
        <p className="text-sm leading-6 text-slate-500">
          Couldn’t load preferred listers for this search.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2" role="list">
          {listers.map((lister) => (
            <div key={lister._id} role="listitem">
              <ReadOnlyListerChip lister={lister} />
            </div>
          ))}
        </div>
      )}
    </ClientRequestDetailCollapsibleSection>
  )
}
