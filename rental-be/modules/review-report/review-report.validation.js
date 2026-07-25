import {
  validateEnumValue,
  validateLimit,
  validateMongooseId,
  validateObject,
  validateOptionalString,
  validatePage,
} from "../../shared/validators/index.js";
import { AppError } from "../../shared/errors/app-error.js";

import {
  REVIEW_REPORT_REASONS,
  REVIEW_REPORT_STATUSES,
} from "./review-report.constants.js";

export const validateReviewReportReviewId = (input) => {
  return validateMongooseId(input, "reviewId", {
    asObjectId: true,
  });
};

export const validateReviewReportId = (input) => {
  return validateMongooseId(input, "reviewReportId", {
    asObjectId: true,
  });
};

export const validateCreateReviewReportBody = (input) => {
  validateObject(input, "body");

  if (input.reason == null) {
    throw new AppError("reason is required", 422, "VALIDATION_ERROR");
  }

  return {
    reviewId: validateReviewReportReviewId(input.reviewId),
    reason: validateEnumValue(
      input.reason,
      "reason",
      Object.values(REVIEW_REPORT_REASONS),
    ),
    note: validateOptionalString(input.note, "note", 1000),
  };
};

export const validateReviewReportStatus = (input) => {
  return validateEnumValue(
    input,
    "status",
    Object.values(REVIEW_REPORT_STATUSES),
    null,
  );
};

export const validateAdminSearchReviewReportsQuery = (input = {}) => {
  validateObject(input, "query");

  return {
    status: validateReviewReportStatus(input.status),
    page: validatePage(input.page),
    limit: validateLimit(input.limit),
  };
};

export const validateAdminUpdateReviewReportStatusBody = (input) => {
  validateObject(input, "body");

  if (input.status == null) {
    throw new AppError("status is required", 422, "VALIDATION_ERROR");
  }

  const status = validateEnumValue(input.status, "status", [
    REVIEW_REPORT_STATUSES.REVIEWED,
    REVIEW_REPORT_STATUSES.DISMISSED,
    REVIEW_REPORT_STATUSES.ACTION_TAKEN,
  ]);
  const reviewNote = validateOptionalString(input.reviewNote, "reviewNote", 1000);

  if (
    [
      REVIEW_REPORT_STATUSES.DISMISSED,
      REVIEW_REPORT_STATUSES.ACTION_TAKEN,
    ].includes(status) &&
    !reviewNote
  ) {
    throw new AppError("reviewNote is required", 422, "VALIDATION_ERROR");
  }

  return {
    status,
    reviewNote,
  };
};
