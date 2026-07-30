// Done
// modules/search/pipelines/helpers/build-search-buildings.pipeline.js
import { buildIsFollowingFieldStages } from "../../../building-follow/pipelines/index.js";
import { buildBuildingMatchStages } from "./build-building-match-stages.js";
import { buildListingsFromBuildingLookupStages } from "./build-listings-from-building-lookup-stages.js";

export const buildSearchBuildingsPipeline = ({
    match = {},
    filters = { building: {}, listing: {}, agent: {} },
    page = 1,
    limit = 20,
    listingLimit = 4,
    includeBuildingsWithoutMatchingListings = false,
    viewerUserId = null,
} = {}) => {
    const skip = (page - 1) * limit;

    return [
        ...buildBuildingMatchStages({
            match,
            filters: filters.building ?? {},
            requireAvailableListings: !includeBuildingsWithoutMatchingListings,
        }),

        ...buildListingsFromBuildingLookupStages({
            filters,
            lookupAgentProfile: true,
            removeAgentProfile: true,
            limit: listingLimit,
            viewerUserId,
        }),
        ...(includeBuildingsWithoutMatchingListings
            ? []
            : [
                {
                    $match: {
                        "listings.0": { $exists: true },
                    },
                },
            ]),
        {
            $addFields: {
                latestListingUpdatedAt: { $max: "$listings.updatedAt" },
            },
        },
        {
            $sort: {
                latestListingUpdatedAt: -1,
                _id: 1,
            },
        },
        {
            $facet: {
                data: [
                    { $skip: skip },
                    { $limit: limit },
                    ...buildIsFollowingFieldStages(viewerUserId),
                    {
                        $project: {
                            name: 1,
                            buildingType: 1,
                            facilities: 1,
                            security: 1,
                            location: 1,
                            address: 1,
                            minRent: 1,
                            maxRent: 1,
                            listings: 1,
                            isFollowing: 1,
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
};
