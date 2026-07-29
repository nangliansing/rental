export type ReviewTagCountLike = {
  tag?: unknown
  count?: unknown
}

export type TopReviewTag = {
  tag: string
  count: number
}

export const DEFAULT_TOP_REVIEW_TAG_LIMIT = 2

/**
 * Returns the highest-count review tags, capped at `limit`.
 * Defensive against malformed API payloads.
 */
export function getTopReviewTags(
  tagCounts: readonly ReviewTagCountLike[] | null | undefined,
  limit = DEFAULT_TOP_REVIEW_TAG_LIMIT,
): TopReviewTag[] {
  if (!Array.isArray(tagCounts) || !Number.isFinite(limit) || limit <= 0) {
    return []
  }

  const countsByTag = new Map<string, number>()

  for (const item of tagCounts) {
    const tag =
      typeof item?.tag === "string" ? item.tag.trim().toUpperCase() : ""
    const rawCount =
      typeof item?.count === "number" ? item.count : Number(item?.count)

    if (!tag || !Number.isFinite(rawCount)) continue

    const count = Math.trunc(rawCount)
    if (count <= 0) continue

    countsByTag.set(tag, (countsByTag.get(tag) ?? 0) + count)
  }

  return [...countsByTag.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, Math.trunc(limit))
}
