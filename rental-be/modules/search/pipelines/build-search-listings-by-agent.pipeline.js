// modules/search/pipelines/build-search-listings-by-agent.pipeline.js
import { buildBuildingFromListingLookupStages } from "../../listing/pipelines/helpers/index.js";
import {
    LISTING_VISIBILITIES,
} from "../../listing/listing.constants.js";
import {
    buildListingAvailabilityFilterMatch,
    buildOwnerListingSort,
} from "../../listing/utils/index.js";
import { buildSavedListingLookupStages } from "./helpers/build-saved-listing-lookup-stages.js";

export const buildSearchListingsByAgentPipeline = ({
    agentUserId,
    page = 1,
    limit = 20,
    filter,
    sort,
    referenceDate = new Date(),
    viewerUserId = null,
}) => {
    const skip = (page - 1) * limit;

    return [
        {
            $match: {
                listedBy: agentUserId,
                isDeleted: false,
                visibility: LISTING_VISIBILITIES.PUBLIC,
                ...buildListingAvailabilityFilterMatch(filter, referenceDate),
            },
        },
        ...buildBuildingFromListingLookupStages({
            preserveNullAndEmptyArrays: false,
            requireActive: true,
        }),
        ...buildSavedListingLookupStages(viewerUserId),
        {
            $sort: buildOwnerListingSort({ filter, sort }),
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
