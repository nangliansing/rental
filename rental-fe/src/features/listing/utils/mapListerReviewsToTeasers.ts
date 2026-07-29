import type { ListerReview } from "@/features/lister-review/api"

export type ReviewTeaserPhoto = {
  secureUrl?: string | null
  alt?: string | null
}

export type ReviewTeaserItem = {
  id: string
  displayName: string
  text: string
  photo?: ReviewTeaserPhoto | null
  colorKey?: string | null
}

/** Rating-only reviews still count, so they get a rating line instead of a comment. */
function formatRatingOnlyText(rating: unknown): string | null {
  if (typeof rating !== "number" || !Number.isFinite(rating)) return null

  const clamped = Math.min(5, Math.max(1, Math.round(rating)))
  return `Rated ${clamped} out of 5`
}

/**
 * Maps public lister reviews into rotating teaser items.
 * Falls back to a rating line when a review has no comment, so the teaser count
 * stays consistent with the review count shown in the card title. Deleted and
 * collapsed reviews are skipped: the dialog hides collapsed text behind a
 * "View anyway" step, so it must never surface in a one-line teaser.
 */
export function mapListerReviewsToTeasers(
  reviews: readonly ListerReview[],
): ReviewTeaserItem[] {
  const teasers: ReviewTeaserItem[] = []
  const seenIds = new Set<string>()

  for (const review of reviews) {
    if (!review?._id || seenIds.has(review._id)) continue
    if (review.isDeleted || review.visibility?.isCollapsed) continue

    const text = review.comment?.trim() || formatRatingOnlyText(review.rating)
    if (!text) continue

    seenIds.add(review._id)

    const displayName =
      review.reviewer?.displayName?.trim() ||
      review.reviewer?.name?.trim() ||
      "Anonymous"

    teasers.push({
      id: review._id,
      displayName,
      text,
      photo: review.reviewer?.profilePhoto ?? null,
      colorKey: review.reviewer?.userId ?? review.reviewerId,
    })
  }

  return teasers
}
