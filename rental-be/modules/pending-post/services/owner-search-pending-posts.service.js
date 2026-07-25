import { normalizePagination } from "../../../shared/utils/index.js";
import {
  validateLimit,
  validateMongooseId,
  validateNullableObject,
  validateObject,
  validatePage,
} from "../../../shared/validators/index.js";

import PendingPost from "../pending-post.model.js";
import { buildExistingBuildingLookupStages } from "../pipelines/index.js";
import { validatePendingPostStatus } from "../pending-post.validation.js";

export const ownerSearchPendingPostsService = async (
  queryInput,
  actorId,
  session = null,
) => {
  validateNullableObject(session, "session");
  validateObject(queryInput, "query");

  const submittedBy = validateMongooseId(actorId, "submittedBy", {
    asObjectId: true,
  });
  const page = validatePage(queryInput.page);
  const limit = validateLimit(queryInput.limit);
  const skip = (page - 1) * limit;
  const status = validatePendingPostStatus(queryInput.status);

  const match = {
    submittedBy,
    isDeleted: { $ne: true },
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
          ...buildExistingBuildingLookupStages(),
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

  let pendingPostsQuery = PendingPost.aggregate(pipeline);

  if (session) {
    pendingPostsQuery = pendingPostsQuery.session(session);
  }

  const [result] = await pendingPostsQuery;

  return {
    pendingPosts: result?.data ?? [],
    pagination: normalizePagination(result?.pagination, page, limit),
  };
};
