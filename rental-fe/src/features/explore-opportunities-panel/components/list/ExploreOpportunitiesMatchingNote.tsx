import { memo } from "react"

import { formatOpportunityMatchingNote } from "../../utils/formatOpportunityMatchingNote"

type ExploreOpportunitiesMatchingNoteProps = {
  myMatchingBuildingCount: number | null
  matchingBuildingCountCapped?: boolean
}

function ExploreOpportunitiesMatchingNoteComponent({
  myMatchingBuildingCount,
  matchingBuildingCountCapped = false,
}: ExploreOpportunitiesMatchingNoteProps) {
  const note = formatOpportunityMatchingNote(
    myMatchingBuildingCount,
    matchingBuildingCountCapped,
  )

  if (!note) return null

  return (
    <p className="mt-1.5 text-xs leading-5 text-slate-500">{note}</p>
  )
}

export const ExploreOpportunitiesMatchingNote = memo(
  ExploreOpportunitiesMatchingNoteComponent,
)
