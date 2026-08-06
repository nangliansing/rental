import { memo } from "react"

import { formatCappedSavedSearchMatchingTotal } from "./formatSavedSearchListMeta"

type MatchingBuildingCountChipsProps = {
  myMatchingBuildingCount: number | null | undefined
  platformMatchingBuildingCount: number | null | undefined
  matchingBuildingCountCapped?: boolean
  className?: string
}

function MatchingBuildingCountChipsComponent({
  myMatchingBuildingCount,
  platformMatchingBuildingCount,
  matchingBuildingCountCapped = false,
  className = "mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold tabular-nums",
}: MatchingBuildingCountChipsProps) {
  if (
    myMatchingBuildingCount == null ||
    platformMatchingBuildingCount == null
  ) {
    return null
  }

  const showMine = myMatchingBuildingCount > 0
  const showPlatform = platformMatchingBuildingCount > 0

  if (!showMine && !showPlatform) {
    return null
  }

  return (
    <span className={className}>
      {showMine ? (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-blue-700 ring-1 ring-inset ring-blue-100"
          aria-label={`${myMatchingBuildingCount} matching buildings from your listings`}
        >
          <span className="font-medium text-blue-600">Yours</span>
          {myMatchingBuildingCount}
        </span>
      ) : null}

      {showPlatform ? (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-700 ring-1 ring-inset ring-slate-200"
          aria-label={`${platformMatchingBuildingCount} matching buildings from platform listings`}
        >
          <span className="font-medium text-slate-500">Platform</span>
          {platformMatchingBuildingCount}
        </span>
      ) : null}

      {matchingBuildingCountCapped ? (
        <span
          className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 ring-1 ring-inset ring-amber-200"
          aria-label="Matching-building counts are capped; at least 20 buildings match"
          title="Counts show the first 20 matching buildings; more matches exist."
        >
          {formatCappedSavedSearchMatchingTotal(
            myMatchingBuildingCount,
            platformMatchingBuildingCount,
          )}
        </span>
      ) : null}
    </span>
  )
}

/** Shared Yours/Platform matching chips — hides each chip when its count is 0. */
export const MatchingBuildingCountChips = memo(
  MatchingBuildingCountChipsComponent,
)
