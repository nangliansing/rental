// modules/search/pipelines/build-search-buildings-nearby.pipeline.js
import { buildIsFollowingFieldStages } from "../../building-follow/pipelines/index.js";
import { buildBuildingSearchMatch } from "./helpers/build-building-search-match.js";
import { buildListingsFromBuildingLookupStages } from "./helpers/build-listings-from-building-lookup-stages.js";

export const buildSearchBuildingsNearbyPipeline = ({
    position,
    radiusMeters = 300,
    filters = { building: {}, listing: {}, agent: {} },
    limit = 20,
    listingLimit = 4,
    includeBuildingsWithoutMatchingListings = false,
    viewerUserId = null,
} = {}) => {
    const buildingMatch = buildBuildingSearchMatch({
        filters: filters.building ?? {},
        requireAvailableListings: !includeBuildingsWithoutMatchingListings,
    });

    return [
        {
            $geoNear: {
                near: {
                    type: "Point",
                    coordinates: [position.lng, position.lat],
                },
                distanceField: "distanceMeters",
                maxDistance: radiusMeters,
                spherical: true,
                query: buildingMatch,
            },
        },

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
            $sort: {
                distanceMeters: 1,
                _id: 1,
            },
        },
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
                distanceMeters: { $round: ["$distanceMeters", 0] },
                isFollowing: 1,
            },
        },
    ];
};
