/** Owner list sort: most recently confirmed first, then stable fallbacks. */
export const buildOwnerSearchSavedSearchesPipeline = ({
  match,
  page,
  skip,
  limit,
  includeCoverage = false,
}) => [
  { $match: match },
  {
    $facet: {
      data: [
        {
          $sort: {
            lastConfirmedAt: -1,
            createdAt: -1,
            _id: 1,
          },
        },
        { $skip: skip },
        { $limit: limit },
        ...(includeCoverage
          ? []
          : [{ $project: { "geoSearch.coverage": 0 } }]),
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
