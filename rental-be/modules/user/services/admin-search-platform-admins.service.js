import { normalizePagination } from "../../../shared/utils/index.js";
import { validateNullableObject } from "../../../shared/validators/index.js";

import User from "../user.model.js";
import { validateSearchPlatformAdminsQuery } from "../user.validation.js";
import {
  buildPlatformAdminListDataPipeline,
  buildPlatformAdminMatch,
} from "../utils/index.js";

export const adminSearchPlatformAdminsService = async (
  queryInput,
  session = null,
) => {
  validateNullableObject(session, "session");

  const { page, limit } = validateSearchPlatformAdminsQuery(queryInput);
  const skip = (page - 1) * limit;

  const pipeline = [
    {
      $match: buildPlatformAdminMatch(),
    },
    {
      $facet: {
        data: buildPlatformAdminListDataPipeline({ skip, limit }),
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

  let query = User.aggregate(pipeline);

  if (session) {
    query = query.session(session);
  }

  const [result] = await query;

  return {
    users: result?.data ?? [],
    pagination: normalizePagination(result?.pagination, page, limit),
  };
};
