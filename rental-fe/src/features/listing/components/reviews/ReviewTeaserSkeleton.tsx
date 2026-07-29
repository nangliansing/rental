import { ReviewTeaserRow } from "./ReviewTeaserRow"

/**
 * Skeleton avatar + comment bar while lister review teasers load.
 * The bar sits in a `leading-5`-tall box so it shares the avatar's center line
 * and matches the height of a loaded single-line teaser.
 */
export function ReviewTeaserSkeleton() {
  return (
    <ReviewTeaserRow
      aria-label="Loading lister reviews"
      aria-busy
      avatar={
        <span
          className="block h-7 w-7 animate-pulse rounded-full bg-slate-200"
          aria-hidden="true"
        />
      }
      text={
        <span className="flex h-5 items-center" aria-hidden="true">
          <span className="block h-3 w-[72%] max-w-[15rem] animate-pulse rounded bg-slate-200" />
        </span>
      }
    />
  )
}
