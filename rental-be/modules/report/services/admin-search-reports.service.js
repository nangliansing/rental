import { normalizePagination } from "../../../shared/utils/index.js";
import { validateNullableObject } from "../../../shared/validators/index.js";

import Report from "../report.model.js";
import { REPORT_TARGET_TYPES } from "../report.constants.js";
import { validateAdminSearchReportsQuery } from "../report.validation.js";
import { buildAdminReportLookupStages } from "../utils/admin-report-aggregation.js";

export const adminSearchReportsService = async (
  queryInput,
  session = null,
) => {
  validateNullableObject(session, "session");

  const { status, page, limit } = validateAdminSearchReportsQuery(queryInput);
  const skip = (page - 1) * limit;
  const match = {
    targetType: REPORT_TARGET_TYPES.LISTING,
  };

  if (status) {
    match.status = status;
  }

  const pipeline = [
    { $match: match },
    {
      $facet: {
        data: [
          { $sort: { createdAt: -1, _id: 1 } },
          { $skip: skip },
          { $limit: limit },
          ...buildAdminReportLookupStages(),
        ],
        pagination: [{ $count: "total" }],
      },
    },
    {
      $project: {
        data: 1,
        pagination: {
          page: { $literal: page },
          limit: { $literal: limit },
          total: {
            $ifNull: [{ $arrayElemAt: ["$pagination.total", 0] }, 0],
          },
        },
      },
    },
  ];

  let reportsQuery = Report.aggregate(pipeline);

  if (session) {
    reportsQuery = reportsQuery.session(session);
  }

  const [result] = await reportsQuery;

  return {
    reports: result?.data ?? [],
    pagination: normalizePagination(result?.pagination, page, limit),
  };
};
