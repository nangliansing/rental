import {
  validateEnumValue,
  validateLimit,
  validateMongooseId,
  validateObject,
  validateOptionalString,
  validatePage,
} from "../../shared/validators/index.js";
import { AppError } from "../../shared/errors/app-error.js";
import { REPORT_REASONS, REPORT_STATUSES } from "./report.constants.js";

export const validateReportId = (input) => {
  return validateMongooseId(input, "reportId", {
    asObjectId: true,
  });
};

export const validateCreateReportBody = (input) => {
  validateObject(input, "body");

  if (input.reason == null) {
    throw new AppError("reason is required", 422, "VALIDATION_ERROR");
  }

  return {
    listingId: validateMongooseId(input.listingId, "listingId", {
      asObjectId: true,
    }),
    reason: validateEnumValue(
      input.reason,
      "reason",
      Object.values(REPORT_REASONS),
    ),
    note: validateOptionalString(input.note, "note", 1000),
  };
};

export const validateReportStatus = (input) => {
  return validateEnumValue(
    input,
    "status",
    Object.values(REPORT_STATUSES),
    null,
  );
};

export const validateAdminSearchReportsQuery = (input = {}) => {
  validateObject(input, "query");

  return {
    status: validateReportStatus(input.status),
    page: validatePage(input.page),
    limit: validateLimit(input.limit),
  };
};

export const validateAdminUpdateReportStatusBody = (input) => {
  validateObject(input, "body");

  if (input.status == null) {
    throw new AppError("status is required", 422, "VALIDATION_ERROR");
  }

  const status = validateEnumValue(input.status, "status", [
    REPORT_STATUSES.REVIEWED,
    REPORT_STATUSES.DISMISSED,
    REPORT_STATUSES.ACTION_TAKEN,
  ]);
  const reviewNote = validateOptionalString(input.reviewNote, "reviewNote", 1000);

  if (
    [REPORT_STATUSES.DISMISSED, REPORT_STATUSES.ACTION_TAKEN].includes(status) &&
    !reviewNote
  ) {
    throw new AppError("reviewNote is required", 422, "VALIDATION_ERROR");
  }

  return {
    status,
    reviewNote,
  };
};
