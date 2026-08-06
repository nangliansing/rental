import { SAVED_SEARCH_STATUSES } from "../../saved-search/saved-search.constants.js";

export const buildSearchAgentDemandOpportunityCandidatesPipeline = ({
  coverage,
  maximumCandidates,
}) => [
  {
    $match: {
      status: SAVED_SEARCH_STATUSES.WAITING,
      isDeleted: false,
      "geoSearch.coverage": { $geoIntersects: { $geometry: coverage } },
    },
  },
  { $limit: maximumCandidates + 1 },
  {
    $project: {
      _id: 1,
      name: 1,
      status: 1,
      filters: 1,
      geoSearch: 1,
      createdAt: 1,
      updatedAt: 1,
      lastConfirmedAt: 1,
    },
  },
];
