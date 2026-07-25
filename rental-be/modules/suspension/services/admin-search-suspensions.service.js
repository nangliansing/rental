import { normalizePagination } from "../../../shared/utils/index.js";
import { validateNullableObject } from "../../../shared/validators/index.js";

import Suspension from "../suspension.model.js";
import { SUSPENSION_STATUSES } from "../suspension.constants.js";
import { validateSearchSuspensionsQuery } from "../suspension.validation.js";
import { buildAdminSuspensionListDataPipeline } from "../utils/admin-suspension-aggregation.js";

const buildStatusMatch = (status, now) => {
  if (!status) return {};

  if (status === SUSPENSION_STATUSES.ACTIVE) {
    return {
      status: SUSPENSION_STATUSES.ACTIVE,
      expiresAt: { $gt: now },
    };
  }

  if (status === SUSPENSION_STATUSES.EXPIRED) {
    return {
      $or: [
        { status: SUSPENSION_STATUSES.EXPIRED },
        {
          status: SUSPENSION_STATUSES.ACTIVE,
          expiresAt: { $lte: now },
        },
      ],
    };
  }

  return { status };
};

export const adminSearchSuspensionsService = async (
  queryInput,
  session = null,
) => {
  validateNullableObject(session, "session");

  const { status, page, limit } = validateSearchSuspensionsQuery(queryInput);
  const skip = (page - 1) * limit;
  const match = buildStatusMatch(status, new Date());

  const pipeline = [
    { $match: match },
    {
      $facet: {
        data: [
          ...buildAdminSuspensionListDataPipeline({ skip, limit }),
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

  let suspensionsQuery = Suspension.aggregate(pipeline);

  if (session) {
    suspensionsQuery = suspensionsQuery.session(session);
  }

  const [result] = await suspensionsQuery;

  return {
    suspensions: result?.data ?? [],
    pagination: normalizePagination(result?.pagination, page, limit),
  };
};
