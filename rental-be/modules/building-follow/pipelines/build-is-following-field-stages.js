import { COLLECTION_NAMES } from "../../../shared/constants/index.js";

export const buildIsFollowingFieldStages = (viewerUserId = null) => {
  if (!viewerUserId) {
    return [
      {
        $addFields: {
          isFollowing: false,
        },
      },
    ];
  }

  return [
    {
      $lookup: {
        from: COLLECTION_NAMES.BuildingFollows,
        let: { buildingId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$buildingId", "$$buildingId"] },
                  { $eq: ["$userId", viewerUserId] },
                ],
              },
            },
          },
          { $limit: 1 },
          { $project: { _id: 1 } },
        ],
        as: "_followedByMe",
      },
    },
    {
      $addFields: {
        isFollowing: { $gt: [{ $size: "$_followedByMe" }, 0] },
      },
    },
    {
      $project: {
        _followedByMe: 0,
      },
    },
  ];
};
