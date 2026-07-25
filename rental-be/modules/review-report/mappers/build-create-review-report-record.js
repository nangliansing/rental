import { REVIEW_REPORT_STATUSES } from "../review-report.constants.js";
import { validateCreateReviewReportBody } from "../review-report.validation.js";

export const buildCreateReviewReportRecord = (
  body,
  reportedBy,
  review,
) => {
  const { reviewId, reason, note } = validateCreateReviewReportBody(body);

  return {
    reviewId,
    listerProfileId: review.listerProfileId,
    reviewOwnerId: review.reviewerId,
    reportedBy,
    reason,
    note,
    status: REVIEW_REPORT_STATUSES.OPEN,
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
    actionTakenBy: null,
    actionTakenAt: null,
    actionReason: null,
    isDeleted: false,
    deletedAt: null,
  };
};
