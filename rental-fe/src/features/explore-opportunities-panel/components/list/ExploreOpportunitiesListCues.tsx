import { Fragment, memo } from "react"
import { Bed, CalendarDays, Users } from "lucide-react"

import type { OpportunityListCue } from "../../utils/formatOpportunityListMeta"

type ExploreOpportunitiesListCuesProps = {
  cues: OpportunityListCue[]
}

function ExploreOpportunitiesListCuesComponent({
  cues,
}: ExploreOpportunitiesListCuesProps) {
  if (cues.length === 0) return null

  return (
    <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-5 text-slate-500">
      {cues.map((cue, index) => (
        <Fragment key={`${cue.kind}:${cue.label}`}>
          {index > 0 ? (
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
          ) : null}
          <OpportunityListCueMark cue={cue} />
        </Fragment>
      ))}
    </span>
  )
}

function OpportunityListCueMark({ cue }: { cue: OpportunityListCue }) {
  if (cue.kind === "rent") {
    return <span className="shrink-0 tabular-nums">{cue.label}</span>
  }

  if (cue.kind === "bedroom" && cue.value === 0) {
    return <span className="shrink-0">{cue.label}</span>
  }

  const Icon =
    cue.kind === "bedroom" ? Bed : cue.kind === "contract" ? CalendarDays : Users
  const value =
    cue.kind === "bedroom" || cue.kind === "contract" || cue.kind === "occupancy"
      ? cue.value
      : null

  return (
    <span
      className="inline-flex shrink-0 items-center gap-0.5 tabular-nums"
      aria-label={cue.label}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {value}
    </span>
  )
}

export const ExploreOpportunitiesListCues = memo(
  ExploreOpportunitiesListCuesComponent,
)
