import { normalizePagination } from "../../../shared/utils/index.js";
import {
  validateLimit,
  validateNullableObject,
  validateObject,
  validatePage,
} from "../../../shared/validators/index.js";

import BuildingEditRequest from "../building-edit-request.model.js";
import { validateBuildingEditRequestStatus } from "../building-edit-request.validation.js";
import { buildAdminBuildingEditRequestListDataPipeline } from "../utils/index.js";

export const adminSearchBuildingEditRequestsService = async (
  queryInput,
  session = null,
) => {
  validateNullableObject(session, "session");
  validateObject(queryInput, "query");

  const page = validatePage(queryInput.page);
  const limit = validateLimit(queryInput.limit);
  const skip = (page - 1) * limit;
  const status = validateBuildingEditRequestStatus(queryInput.status);

  const match = {};

  if (status) {
    match.status = status;
  }

  const pipeline = [
    { $match: match },
    {
      $facet: {
        data: buildAdminBuildingEditRequestListDataPipeline({ skip, limit }),
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

  let query = BuildingEditRequest.aggregate(pipeline);

  if (session) {
    query = query.session(session);
  }

  const [result] = await query;

  return {
    buildingEditRequests: result?.data ?? [],
    pagination: normalizePagination(result?.pagination, page, limit),
  };
};
