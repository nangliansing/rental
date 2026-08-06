/**
 * Human note for matched opportunities — caller buildings only, no platform count.
 * Returns null when there is nothing useful to say.
 */
export function formatOpportunityMatchingNote(
  myMatchingBuildingCount: number | null | undefined,
  matchingBuildingCountCapped = false,
): string | null {
  if (
    typeof myMatchingBuildingCount !== "number" ||
    !Number.isFinite(myMatchingBuildingCount) ||
    myMatchingBuildingCount <= 0
  ) {
    return null
  }

  const count = Math.trunc(myMatchingBuildingCount)
  if (count <= 0) return null

  if (count === 1 && !matchingBuildingCountCapped) {
    return "Your 1 building is visible to this demand"
  }

  const countLabel = matchingBuildingCountCapped ? `${count}+` : String(count)
  return `Your ${countLabel} buildings are visible to this demand`
}
