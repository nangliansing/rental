// Done
// modules/search/pipelines/helpers/build-search-listings.pipeline.js
import { buildAgentProfileFromListingLookupStages } from "./build-agent-profile-from-listing-lookup-stages.js";
import { buildListingFilterMatch } from "./build-listing-filter-match.js";
import { buildSavedListingLookupStages } from "./build-saved-listing-lookup-stages.js";

export const buildSearchListingsPipeline = ({
    match = {},
    filters = {},
    page = 1,
    limit = 20,
    includeAgentProfile = true,
    removeAgentProfile = false,
    preserveNullAndEmptyArrays = false,
    requireActiveUser = true,
    viewerUserId = null,
} = {}) => {
    const skip = (page - 1) * limit;

    const listingFilters = filters.listing ?? {};
    const agentFilters = filters.agent ?? {};

    const listingMatch = {
        ...match,
        ...buildListingFilterMatch(listingFilters),
    };

    return [
        {
            $match: listingMatch,
        },

        ...(includeAgentProfile
            ? buildAgentProfileFromListingLookupStages({
                supportLanguages: agentFilters.supportLanguages,
                removeAgentProfile,
                preserveNullAndEmptyArrays,
                requireActiveUser,
            })
            : []),

        ...buildSavedListingLookupStages(viewerUserId),

        {
            $sort: {
                updatedAt: -1,
                _id: 1,
            },
        },
        {
            $facet: {
                data: [{ $skip: skip }, { $limit: limit }],
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
