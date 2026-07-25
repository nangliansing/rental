import { REPORT_STATUSES, REPORT_TARGET_TYPES } from "../report.constants.js";
import { validateCreateReportBody } from "../report.validation.js";

export const buildCreateReportRecord = (body, reportedBy) => {
  const { listingId, reason, note } = validateCreateReportBody(body);

  return {
    targetType: REPORT_TARGET_TYPES.LISTING,
    listingId,
    reportedBy,
    reason,
    note,
    status: REPORT_STATUSES.OPEN,
    reviewedBy: null,
    reviewedAt: null,
    reviewNote: null,
  };
};
