import { BadgeCheck, Star } from "lucide-react"

import type { SearchAgentProfile } from "@/features/agent/api/searchAgentProfiles"
import { getPopularReviewTags } from "@/features/lister-review/utils/getPopularReviewTags"
import { formatReviewTag } from "@/features/lister-review/utils/reviewFormatters"
import { formatProfileMetaText } from "@/features/profile/components/ProfileOverviewPrimitives"

type ListerSearchResultDetailsProps = {
  lister: SearchAgentProfile
}

/** Shared identity + review signals for autocomplete and picker result rows. */
export function ListerSearchResultDetails({
  lister,
}: ListerSearchResultDetailsProps) {
  const displayName = lister.displayName ?? "Lister"
  const metaText = formatProfileMetaText({
    createdAt: lister.createdAt,
    languages: lister.supportLanguages,
  })
  const reviewCount = lister.reviewSummary.reviewCount
  const hasReviews = reviewCount > 0
  const reviewLabel = reviewCount === 1 ? "review" : "reviews"
  const popularTags = hasReviews
    ? getPopularReviewTags(lister.reviewSummary, 2)
    : []

  return (
    <span className="min-w-0 flex-1">
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="truncate text-sm font-semibold text-slate-950">
          {displayName}
        </span>
        {lister.isVerified ? (
          <BadgeCheck
            className="h-4 w-4 shrink-0 fill-[#1d9bf0] text-white"
            strokeWidth={3}
          />
        ) : null}
      </span>

      {metaText ? (
        <span className="mt-0.5 block truncate text-xs text-slate-500">
          {metaText}
        </span>
      ) : null}

      {hasReviews ? (
        <span className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-slate-500">
          <Star
            className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400"
            aria-hidden="true"
          />
          <span className="truncate">
            {lister.reviewSummary.averageRating.toFixed(1)} · {reviewCount}{" "}
            {reviewLabel}
          </span>
        </span>
      ) : (
        <span className="mt-0.5 block text-xs text-slate-400">
          No reviews yet
        </span>
      )}

      {popularTags.length > 0 ? (
        <span className="mt-1.5 flex flex-wrap gap-1.5">
          {popularTags.map((item) => (
            <span
              key={item.tag}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
            >
              {formatReviewTag(item.tag)}
            </span>
          ))}
        </span>
      ) : null}
    </span>
  )
}
