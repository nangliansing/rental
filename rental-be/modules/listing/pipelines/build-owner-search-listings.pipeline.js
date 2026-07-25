// modules/listing/pipelines/build-owner-search-listings.pipeline.js
import { buildSavedListingLookupStages } from "../../search/pipelines/helpers/index.js";
import { buildBuildingFromListingLookupStages } from "./helpers/index.js";

export const buildOwnerSearchListingsPipeline = ({
    match = {},
    sort = { updatedAt: -1, _id: 1 },
    page,
    skip,
    limit,
    viewerUserId = null,
}) => {
    return [
        { $match: match },
        {
            $facet: {
                data: [
                    { $sort: sort },
                    { $skip: skip },
                    { $limit: limit },
                    ...buildBuildingFromListingLookupStages(),
                    ...buildSavedListingLookupStages(viewerUserId),
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
