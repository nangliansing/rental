// modules/search/pipelines/build-search-listings-by-agent.pipeline.js
import { buildBuildingFromListingLookupStages } from "../../listing/pipelines/helpers/index.js";
import {
    LISTING_VISIBILITIES,
    OWNER_LISTING_SORTS,
} from "../../listing/listing.constants.js";
import { buildSavedListingLookupStages } from "./helpers/build-saved-listing-lookup-stages.js";

export const buildSearchListingsByAgentPipeline = ({
    agentUserId,
    page = 1,
    limit = 20,
    sort = OWNER_LISTING_SORTS.LATEST,
    viewerUserId = null,
}) => {
    const skip = (page - 1) * limit;
    const sortDirection = sort === OWNER_LISTING_SORTS.OLDEST ? 1 : -1;

    return [
        {
            $match: {
                listedBy: agentUserId,
                isDeleted: false,
                visibility: LISTING_VISIBILITIES.PUBLIC,
            },
        },
        ...buildBuildingFromListingLookupStages({
            preserveNullAndEmptyArrays: false,
            requireActive: true,
        }),
        ...buildSavedListingLookupStages(viewerUserId),
        {
            $sort: {
                updatedAt: sortDirection,
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
