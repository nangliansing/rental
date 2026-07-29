import { Avatar } from "@/shared/components/data-display/Avatar"

import { ReviewTeaserRow } from "./ReviewTeaserRow"

/** Listing-level reviews are not available yet. */
export function ListingReviewsComingSoon() {
  return (
    <ReviewTeaserRow
      avatar={
        <Avatar
          size="xs"
          className="shrink-0 opacity-60"
          alt="Listing reviews"
        />
      }
      text={
        <p className="truncate text-sm leading-5 text-slate-400">
          Coming in the future
        </p>
      }
    />
  )
}
