import { AppError } from "../../../shared/errors/app-error.js";
import { validateNullableObject } from "../../../shared/validators/index.js";

import Report from "../report.model.js";
import { validateReportId } from "../report.validation.js";
import { buildAdminReportDetailPipeline } from "../utils/admin-report-aggregation.js";

export const adminGetReportByIdService = async (reportIdInput, session = null) => {
  validateNullableObject(session, "session");

  const reportId = validateReportId(reportIdInput);

  const pipeline = buildAdminReportDetailPipeline(reportId);

  let reportQuery = Report.aggregate(pipeline);

  if (session) {
    reportQuery = reportQuery.session(session);
  }

  const [report] = await reportQuery;

  if (!report) {
    throw new AppError("Report not found", 404, "REPORT_NOT_FOUND");
  }

  return report;
};
