/**
 * Formats lister review summary for SwipeableActionCard title meta.
 * Returns null when there are no reviews to show.
 */
export function formatReviewTitleMeta(
  averageRating: number | null | undefined,
  reviewCount: number | null | undefined,
): string | null {
  const count =
    typeof reviewCount === "number" && Number.isFinite(reviewCount)
      ? Math.max(0, Math.trunc(reviewCount))
      : 0
  if (count <= 0) return null

  const rating =
    typeof averageRating === "number" && Number.isFinite(averageRating)
      ? averageRating.toFixed(1)
      : null
  const reviewLabel = count === 1 ? "review" : "reviews"

  return rating ? `${rating} (${count} ${reviewLabel})` : `${count} ${reviewLabel}`
}
