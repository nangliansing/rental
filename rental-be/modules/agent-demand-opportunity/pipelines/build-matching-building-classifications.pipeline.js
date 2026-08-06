import { COLLECTION_NAMES } from "../../../shared/constants/index.js";
import { buildAgentProfileFromListingLookupStages } from "../../search/pipelines/helpers/build-agent-profile-from-listing-lookup-stages.js";
import { buildBuildingFilterMatch } from "../../search/pipelines/helpers/build-building-filter-match.js";
import { buildListingFilterMatch } from "../../search/pipelines/helpers/build-listing-filter-match.js";
import { omitEmptyArrayFilters } from "../utils/omit-empty-array-filters.js";

export const buildMatchingBuildingClassificationsPipeline = ({
  coverage,
  filters,
  callerUserId,
  listedByUserIds,
  maximumBuildings,
}) => {
  const normalizedFilters = omitEmptyArrayFilters(filters);
  const buildingMatch = buildBuildingFilterMatch(normalizedFilters);
  const listingMatch = buildListingFilterMatch({
    ...normalizedFilters,
    ...(listedByUserIds === undefined ? {} : { listedByUserIds }),
  });

  return [
    {
      $match: {
        ...buildingMatch,
        location: { $geoWithin: { $geometry: coverage } },
      },
    },
    {
      $lookup: {
        from: COLLECTION_NAMES.Listings,
        let: { buildingId: "$_id" },
        pipeline: [
          {
            $match: {
              ...listingMatch,
              $expr: { $eq: ["$buildingId", "$$buildingId"] },
            },
          },
          ...buildAgentProfileFromListingLookupStages({
            supportLanguages: normalizedFilters.supportLanguages,
            removeAgentProfile: true,
            preserveNullAndEmptyArrays: false,
          }),
          { $set: { isMine: { $eq: ["$listedBy", callerUserId] } } },
          { $sort: { isMine: -1, updatedAt: -1, _id: 1 } },
          { $limit: 1 },
          { $project: { _id: 0, isMine: 1 } },
        ],
        as: "matchingListing",
      },
    },
    { $match: { "matchingListing.0": { $exists: true } } },
    { $limit: maximumBuildings + 1 },
    {
      $project: {
        _id: 0,
        isMine: { $arrayElemAt: ["$matchingListing.isMine", 0] },
      },
    },
  ];
};
