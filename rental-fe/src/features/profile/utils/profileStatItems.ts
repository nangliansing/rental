import type { ListerReviewSummary } from "@/features/lister-review/api"

import type { ProfileStatItem } from "../components/ProfileOverviewPrimitives"
import type { ProfileListingSummaryCounts } from "./profileListingSummary"

export function normalizeReviewSummary(
  reviewSummary?: ListerReviewSummary | null,
) {
  const reviewCount =
    typeof reviewSummary?.reviewCount === "number" &&
    Number.isFinite(reviewSummary.reviewCount)
      ? Math.max(0, Math.trunc(reviewSummary.reviewCount))
      : 0

  const averageRating =
    typeof reviewSummary?.averageRating === "number" &&
    Number.isFinite(reviewSummary.averageRating)
      ? Math.max(0, reviewSummary.averageRating)
      : 0

  return { reviewCount, averageRating, hasReviews: reviewCount > 0 }
}

function buildPrimaryProfileStatItems({
  activeCount,
  reviewSummary,
  alwaysShowRating = false,
}: {
  activeCount: number
  reviewSummary?: ListerReviewSummary | null
  alwaysShowRating?: boolean
}) {
  const { reviewCount, averageRating, hasReviews } =
    normalizeReviewSummary(reviewSummary)

  return [
    { id: "listings", value: activeCount, label: "Listings" },
    { id: "reviews", value: reviewCount, label: "Reviews" },
    {
      id: "rating",
      value: averageRating.toFixed(1),
      label: "Rating",
      ...(alwaysShowRating || hasReviews ? {} : { hidden: true }),
    },
  ] satisfies ProfileStatItem[]
}

export function buildOwnerProfileStatRows({
  listingSummary,
  reviewSummary,
}: {
  listingSummary: ProfileListingSummaryCounts
  reviewSummary?: ListerReviewSummary | null
}) {
  const primary = buildPrimaryProfileStatItems({
    activeCount: listingSummary.activeCount,
    reviewSummary,
  })

  const secondary: ProfileStatItem[] = [
    { id: "pending", value: listingSummary.pendingCount, label: "Pending" },
    {
      id: "rejected",
      value: listingSummary.rejectedCount,
      label: "Rejected",
      hidden: listingSummary.rejectedCount <= 0,
    },
  ]

  return { primary, secondary }
}

export function buildListerProfileStatItems({
  activeCount,
  reviewSummary,
}: {
  activeCount: number
  reviewSummary?: ListerReviewSummary | null
}) {
  return buildPrimaryProfileStatItems({
    activeCount,
    reviewSummary,
    alwaysShowRating: true,
  })
}
