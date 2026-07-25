import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import ListerReview from "../../lister-review/lister-review.model.js";
import { buildCreateReviewReportRecord } from "../mappers/index.js";
import ReviewReport from "../review-report.model.js";
import { REVIEW_REPORT_STATUSES } from "../review-report.constants.js";
import { validateCreateReviewReportBody } from "../review-report.validation.js";

const isDuplicateReviewReportError = (error) => {
  return error?.code === 11000;
};

export const createReviewReportService = async (
  body,
  actorId,
  session = null,
) => {
  validateNullableObject(session, "session");

  const reportedBy = validateMongooseId(actorId, "reportedBy");
  const { reviewId } = validateCreateReviewReportBody(body);

  let reviewQuery = ListerReview.findOne({
    _id: reviewId,
    isDeleted: { $ne: true },
  }).select("_id reviewerId listerProfileId");
  let openReportQuery = ReviewReport.exists({
    reviewId,
    reportedBy,
    isDeleted: false,
    status: REVIEW_REPORT_STATUSES.OPEN,
  });

  if (session) {
    reviewQuery = reviewQuery.session(session);
    openReportQuery = openReportQuery.session(session);
  }

  const [review, openReport] = await Promise.all([
    reviewQuery,
    openReportQuery,
  ]);

  if (!review) {
    throw new AppError("Review not found", 404, "REVIEW_NOT_FOUND");
  }

  if (review.reviewerId.equals(reportedBy)) {
    throw new AppError(
      "You cannot report your own review",
      403,
      "REVIEW_REPORT_SELF_NOT_ALLOWED",
    );
  }

  if (openReport) {
    throw new AppError(
      "You already have an open report for this review",
      409,
      "REVIEW_REPORT_ALREADY_EXISTS",
    );
  }

  const record = buildCreateReviewReportRecord(body, reportedBy, review);

  try {
    const [reviewReport] = await ReviewReport.create(
      [record],
      session ? { session } : undefined,
    );

    return reviewReport;
  } catch (error) {
    if (isDuplicateReviewReportError(error)) {
      throw new AppError(
        "You already reported this review",
        409,
        "REVIEW_REPORT_ALREADY_EXISTS",
      );
    }

    throw error;
  }
};
