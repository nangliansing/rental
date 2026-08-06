import { SAVED_SEARCH_STATUSES } from "../../saved-search/saved-search.constants.js";

export const buildSearchAgentDemandOpportunitiesPipeline = ({
  coverage,
  page,
  limit,
}) => [
  {
    $match: {
      status: SAVED_SEARCH_STATUSES.WAITING,
      isDeleted: false,
      "geoSearch.coverage": {
        $geoIntersects: { $geometry: coverage },
      },
    },
  },
  {
    $facet: {
      data: [
        { $sort: { createdAt: -1, _id: 1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            name: 1,
            description: 1,
            status: 1,
            filters: 1,
            "geoSearch.mode": 1,
            "geoSearch.bounds": 1,
            "geoSearch.position": 1,
            "geoSearch.radiusMeters": 1,
            "geoSearch.geometry": 1,
            "geoSearch.distanceMeters": 1,
            "geoSearch.placeName": 1,
            createdAt: 1,
            updatedAt: 1,
          },
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
