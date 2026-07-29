import { Avatar } from "@/shared/components/data-display/Avatar"

import { useListerReviewTeasers } from "../../api/useListerReviewTeasers"
import type { ReviewTagCountLike } from "../../utils/getTopReviewTags"
import {
  resolveListerReviewTeaserState,
  shouldFetchListerReviewTeasers,
} from "../../utils/resolveListerReviewTeaserState"
import { ReviewTeaserEmptyPrompt } from "./ReviewTeaserEmptyPrompt"
import { ReviewTeaserRotation } from "./ReviewTeaserRotation"
import { ReviewTeaserRow } from "./ReviewTeaserRow"
import { ReviewTeaserSkeleton } from "./ReviewTeaserSkeleton"
import { ReviewTeaserTagTabs } from "./ReviewTeaserTagTabs"

type ListerReviewTeasersPageProps = {
  listerProfileId?: string
  /** Known review count from listing summary; `0` skips the network request. */
  reviewCount?: number | null
  /** Summary tag counts from the listing payload (no extra fetch). */
  tagCounts?: readonly ReviewTagCountLike[] | null
  /** When false, teasers stay idle (e.g. card off-screen). */
  enabled?: boolean
}

function ReviewTeaserError() {
  return (
    <ReviewTeaserRow
      aria-label="Lister reviews unavailable"
      avatar={<Avatar size="xs" className="shrink-0" alt="Reviews" />}
      text={
        <p className="truncate text-sm leading-5 text-slate-400">
          Could not load reviews
        </p>
      }
    />
  )
}

export function ListerReviewTeasersPage({
  listerProfileId,
  reviewCount,
  tagCounts,
  enabled = true,
}: ListerReviewTeasersPageProps) {
  const query = useListerReviewTeasers({
    listerProfileId,
    enabled: shouldFetchListerReviewTeasers({
      listerProfileId,
      reviewCount,
      enabled,
    }),
  })

  const state = resolveListerReviewTeaserState({
    listerProfileId,
    reviewCount,
    isError: query.isError,
    response: query.data,
  })

  return (
    <div className="flex flex-col gap-2">
      <ReviewTeaserTagTabs tagCounts={tagCounts} />
      {state.kind === "skeleton" && <ReviewTeaserSkeleton />}
      {state.kind === "error" && <ReviewTeaserError />}
      {state.kind === "empty" && (
        <ReviewTeaserEmptyPrompt hasReviews={state.hasReviews} />
      )}
      {state.kind === "rotation" && (
        <ReviewTeaserRotation
          teasers={state.teasers}
          label="Lister review teasers"
        />
      )}
    </div>
  )
}
