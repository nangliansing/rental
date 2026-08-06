import { COLLECTION_NAMES } from "../../../shared/constants/index.js";
import { buildAgentProfileFromListingLookupStages } from "../../search/pipelines/helpers/build-agent-profile-from-listing-lookup-stages.js";
import { buildBuildingFilterMatch } from "../../search/pipelines/helpers/build-building-filter-match.js";
import { buildListingFilterMatch } from "../../search/pipelines/helpers/build-listing-filter-match.js";
import { omitEmptyArrayFilters } from "../utils/omit-empty-array-filters.js";

export const buildCallerMatchingListingExistsPipeline = ({
  coverage,
  filters,
  callerUserId,
}) => {
  const normalizedFilters = omitEmptyArrayFilters(filters);
  const listingMatch = buildListingFilterMatch(normalizedFilters);
  const buildingMatch = buildBuildingFilterMatch(normalizedFilters);

  return [
    { $match: { ...listingMatch, listedBy: callerUserId } },
    {
      $lookup: {
        from: COLLECTION_NAMES.Buildings,
        let: { buildingId: "$buildingId" },
        pipeline: [
          {
            $match: {
              ...buildingMatch,
              location: { $geoWithin: { $geometry: coverage } },
              $expr: { $eq: ["$_id", "$$buildingId"] },
            },
          },
          { $limit: 1 },
          { $project: { _id: 1 } },
        ],
        as: "matchingBuilding",
      },
    },
    { $match: { "matchingBuilding.0": { $exists: true } } },
    ...buildAgentProfileFromListingLookupStages({
      supportLanguages: normalizedFilters.supportLanguages,
      removeAgentProfile: true,
      preserveNullAndEmptyArrays: false,
    }),
    { $limit: 1 },
    { $project: { _id: 1 } },
  ];
};
