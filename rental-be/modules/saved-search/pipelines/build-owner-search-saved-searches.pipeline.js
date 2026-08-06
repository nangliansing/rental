/**
 * Owner list sort:
 * 1. rows with filters.availableBy first, sooner dates first
 * 2. rows without availableBy last
 * 3. createdAt / _id as stable fallback
 */
export const buildOwnerSearchSavedSearchesPipeline = ({
  match,
  page,
  skip,
  limit,
}) => [
  { $match: match },
  {
    $facet: {
      data: [
        {
          $addFields: {
            _hasAvailableBy: {
              $cond: [
                {
                  $ne: [{ $ifNull: ["$filters.availableBy", null] }, null],
                },
                0,
                1,
              ],
            },
          },
        },
        {
          $sort: {
            _hasAvailableBy: 1,
            "filters.availableBy": 1,
            createdAt: -1,
            _id: 1,
          },
        },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _hasAvailableBy: 0,
            "geoSearch.coverage": 0,
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
