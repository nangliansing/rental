import type { ListerReviewSummary, ListerReviewTagCount } from "../api"

/** Top review tags by count (stable tie-break by tag name). */
export function getPopularReviewTags(
  summary: ListerReviewSummary | null | undefined,
  limit = 2,
): ListerReviewTagCount[] {
  if (!summary || limit <= 0) return []

  return [...(summary.tagCounts ?? [])]
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit)
}
