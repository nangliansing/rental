import { useAuth } from "@/features/auth/hooks/useAuth"
import { Avatar } from "@/shared/components/data-display/Avatar"

import { ReviewTeaserRow } from "./ReviewTeaserRow"

export const EMPTY_LISTER_REVIEW_TEASER_COPY = "Be the first to review"
export const HIDDEN_LISTER_REVIEW_TEASER_COPY = "See all reviews"

type ReviewTeaserEmptyPromptProps = {
  /**
   * True when the lister has reviews that produced no teasers (e.g. hidden or
   * collapsed), so the copy does not contradict the review count in the title.
   */
  hasReviews?: boolean
}

/**
 * Empty-state teaser: viewer avatar when available (else default), plus CTA copy.
 */
export function ReviewTeaserEmptyPrompt({
  hasReviews = false,
}: ReviewTeaserEmptyPromptProps = {}) {
  const { user } = useAuth()
  const displayName = user?.name?.trim() || null

  return (
    <ReviewTeaserRow
      aria-label={hasReviews ? "Lister reviews" : "No lister reviews yet"}
      avatar={
        <Avatar
          displayName={displayName}
          size="xs"
          className="shrink-0"
          alt={displayName ? undefined : "Your profile"}
        />
      }
      text={
        <p className="truncate text-sm leading-5 text-slate-500">
          {hasReviews
            ? HIDDEN_LISTER_REVIEW_TEASER_COPY
            : EMPTY_LISTER_REVIEW_TEASER_COPY}
        </p>
      }
    />
  )
}
