import { Avatar } from "@/shared/components/data-display/Avatar"

import type { ReviewTeaserItem } from "../../utils/mapListerReviewsToTeasers"
import { ReviewTeaserRow } from "./ReviewTeaserRow"

type ReviewTeaserProps = {
  teaser: ReviewTeaserItem
}

/** Single review teaser: reviewer avatar + truncated comment. */
export function ReviewTeaser({ teaser }: ReviewTeaserProps) {
  return (
    <ReviewTeaserRow
      avatar={
        <Avatar
          displayName={teaser.displayName}
          photo={teaser.photo}
          colorKey={teaser.colorKey}
          size="xs"
          className="shrink-0"
        />
      }
      text={
        <p className="truncate text-sm leading-5 text-slate-700">
          {teaser.text}
        </p>
      }
    />
  )
}
