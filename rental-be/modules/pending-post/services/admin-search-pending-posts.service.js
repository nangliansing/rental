import { COLLECTION_NAMES } from "../../../shared/constants/index.js";
import { normalizePagination } from "../../../shared/utils/index.js";
import {
  validateLimit,
  validateNullableObject,
  validateObject,
  validatePage,
} from "../../../shared/validators/index.js";

import PendingPost from "../pending-post.model.js";
import { buildExistingBuildingLookupStages } from "../pipelines/index.js";
import { validateAdminPendingPostStatus } from "../pending-post.validation.js";

export const adminSearchPendingPostsService = async (
  queryInput,
  session = null,
) => {
  validateNullableObject(session, "session");
  validateObject(queryInput, "query");

  const page = validatePage(queryInput.page);
  const limit = validateLimit(queryInput.limit);
  const skip = (page - 1) * limit;
  const status = validateAdminPendingPostStatus(queryInput.status);

  const match = {
    isDeleted: { $ne: true },
    status,
  };

  const pipeline = [
    { $match: match },
    {
      $facet: {
        data: [
          { $sort: { createdAt: -1, _id: 1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $lookup: {
              from: COLLECTION_NAMES.Users,
              localField: "submittedBy",
              foreignField: "_id",
              pipeline: [
                {
                  $project: {
                    name: 1,
                    email: 1,
                    role: 1,
                    status: 1,
                  },
                },
              ],
              as: "submittedBy",
            },
          },
          {
            $unwind: {
              path: "$submittedBy",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: COLLECTION_NAMES.AgentProfiles,
              localField: "submittedBy._id",
              foreignField: "userId",
              pipeline: [
                {
                  $match: {
                    isDeleted: { $ne: true },
                  },
                },
                {
                  $project: {
                    userId: 1,
                    isOnline: 1,
                    displayName: 1,
                    profilePhoto: 1,
                    description: 1,
                    phone: 1,
                    lineUrl: 1,
                    whatsappPhone: 1,
                    telegramUrl: 1,
                    viberPhone: 1,
                    supportLanguages: 1,
                    isVerified: 1,
                  },
                },
              ],
              as: "agentProfile",
            },
          },
          {
            $unwind: {
              path: "$agentProfile",
              preserveNullAndEmptyArrays: true,
            },
          },
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
