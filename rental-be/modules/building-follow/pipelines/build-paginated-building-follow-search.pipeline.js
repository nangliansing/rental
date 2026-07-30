import {
  BUILDING_FOLLOW_LIST_PROJECT,
  BUILDING_FOLLOW_SORT,
} from "./building-follow-pipeline.constants.js";

export const buildPaginatedBuildingFollowSearchPipeline = ({
  match,
  page = 1,
  limit = 20,
  lookupStages = [],
}) => {
  const skip = (page - 1) * limit;

  return [
    { $match: match },
    { $sort: BUILDING_FOLLOW_SORT },
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limit },
          ...lookupStages,
          {
            $project: BUILDING_FOLLOW_LIST_PROJECT,
          },
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
};
