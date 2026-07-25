// Done
// modules/search/pipelines/helpers/build-listings-from-building-lookup-stages.js
import { COLLECTION_NAMES } from "../../../../shared/constants/index.js";
import { buildAgentProfileFromListingLookupStages } from "./build-agent-profile-from-listing-lookup-stages.js";
import { buildListingMatchStages } from "./build-listing-match-stages.js";
import { buildSavedListingLookupStages } from "./build-saved-listing-lookup-stages.js";

export const buildListingsFromBuildingLookupStages = ({
  filters = {},
  lookupAgentProfile = false,
  removeAgentProfile = true,
  limit = 4,
  viewerUserId = null,
} = {}) => {
  return [
    {
      $lookup: {
        from: COLLECTION_NAMES.Listings,
        let: { buildingId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$buildingId", "$$buildingId"] },
            },
          },
          ...buildListingMatchStages({
            filters: filters.listing ?? {},
          }),
          ...(lookupAgentProfile
            ? buildAgentProfileFromListingLookupStages({
                supportLanguages: filters.agent?.supportLanguages,
                removeAgentProfile,
                preserveNullAndEmptyArrays: false,
              })
            : []),
          ...buildSavedListingLookupStages(viewerUserId),
          { $sort: { updatedAt: -1, _id: 1 } },
          { $limit: limit },
        ],
        as: "listings",
      },
    },
  ];
};
