import { normalizePagination } from "../../../shared/utils/index.js";
import { validateNullableObject } from "../../../shared/validators/index.js";

import ReviewReport from "../review-report.model.js";
import { validateAdminSearchReviewReportsQuery } from "../review-report.validation.js";
import { buildAdminReviewReportLookupStages } from "../utils/index.js";

export const adminSearchReviewReportsService = async (
  queryInput,
  session = null,
) => {
  validateNullableObject(session, "session");

  const { status, page, limit } =
    validateAdminSearchReviewReportsQuery(queryInput);
  const skip = (page - 1) * limit;
  const match = {
    isDeleted: false,
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
          ...buildAdminReviewReportLookupStages(),
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

  let reviewReportsQuery = ReviewReport.aggregate(pipeline);

  if (session) {
    reviewReportsQuery = reviewReportsQuery.session(session);
  }

  const [result] = await reviewReportsQuery;

  return {
    reviewReports: result?.data ?? [],
    pagination: normalizePagination(result?.pagination, page, limit),
  };
};
