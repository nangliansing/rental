import { AppError } from "../../../shared/errors/app-error.js";
import { validateNullableObject } from "../../../shared/validators/index.js";

import ReviewReport from "../review-report.model.js";
import { validateReviewReportId } from "../review-report.validation.js";
import { buildAdminReviewReportDetailPipeline } from "../utils/index.js";

export const adminGetReviewReportByIdService = async (
  reviewReportIdInput,
  session = null,
) => {
  validateNullableObject(session, "session");

  const reviewReportId = validateReviewReportId(reviewReportIdInput);

  const pipeline = buildAdminReviewReportDetailPipeline(reviewReportId);

  let reviewReportQuery = ReviewReport.aggregate(pipeline);

  if (session) {
    reviewReportQuery = reviewReportQuery.session(session);
  }

  const [reviewReport] = await reviewReportQuery;

  if (!reviewReport) {
    throw new AppError(
      "Review report not found",
      404,
      "REVIEW_REPORT_NOT_FOUND",
    );
  }

  return reviewReport;
};
