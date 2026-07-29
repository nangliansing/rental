import { RotatingContent } from "@/shared/components/data-display/RotatingContent"
import { useSwipeableActionCardPageActive } from "@/shared/components/data-display/SwipeableActionCard"

import type { ReviewTeaserItem } from "../../utils/mapListerReviewsToTeasers"
import { ReviewTeaser } from "./ReviewTeaser"

/** Dwell long enough for a truncated one-line comment to be readable. */
export const REVIEW_TEASER_DWELL_MS = 6000

type ReviewTeaserRotationProps = {
  teasers: readonly ReviewTeaserItem[]
  label: string
}

export function ReviewTeaserRotation({
  teasers,
  label,
}: ReviewTeaserRotationProps) {
  const active = useSwipeableActionCardPageActive()

  return (
    <RotatingContent
      aria-label={label}
      durationMs={REVIEW_TEASER_DWELL_MS}
      active={active}
    >
      {teasers.map((teaser) => (
        <ReviewTeaser key={teaser.id} teaser={teaser} />
      ))}
    </RotatingContent>
  )
}
