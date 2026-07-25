import type { ListerReview, ListerReviewSummary } from "../api"
import { ReviewListItem } from "./ReviewListItem"

type ReviewListProps = {
  myReview: ListerReview | null
  reviews: ListerReview[]
  reviewSummary?: ListerReviewSummary | null
  currentUserId?: string
  canReportReviews: boolean
  listerUserId: string
  expandedIds: Set<string>
  onToggleExpanded: (reviewId: string) => void
  onEdit: (review: ListerReview) => void
  onReviewSummaryChange: (summary: ListerReviewSummary) => void
}

export function ReviewList({
  myReview,
  reviews,
  reviewSummary,
  currentUserId,
  canReportReviews,
  listerUserId,
  expandedIds,
  onToggleExpanded,
  onEdit,
  onReviewSummaryChange,
}: ReviewListProps) {
  return (
    <>
      {myReview && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Your review
          </p>
          <ReviewListItem
            review={myReview}
            reviewSummary={reviewSummary}
            currentUserId={currentUserId}
            canReportReview={canReportReviews}
            listerUserId={listerUserId}
            isExpanded={expandedIds.has(myReview._id)}
            onToggleExpanded={onToggleExpanded}
            onEdit={onEdit}
            onReviewSummaryChange={onReviewSummaryChange}
          />
        </div>
      )}

      {reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewListItem
              key={review._id}
              review={review}
              reviewSummary={reviewSummary}
              currentUserId={currentUserId}
              canReportReview={canReportReviews}
              listerUserId={listerUserId}
              isExpanded={expandedIds.has(review._id)}
              onToggleExpanded={onToggleExpanded}
              onEdit={onEdit}
              onReviewSummaryChange={onReviewSummaryChange}
            />
          ))}
        </div>
      )}
    </>
  )
}
