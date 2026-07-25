// modules/search/pipelines/build-search-listing-by-id.pipeline.js
import { buildBuildingFromListingLookupStages } from "../../listing/pipelines/helpers/index.js";
import {
    buildAgentProfileFromListingLookupStages,
    buildListingFilterMatch,
    buildSavedListingLookupStages,
} from "./helpers/index.js";

export const buildSearchListingByIdPipeline = ({
    listingId,
    viewerUserId = null,
}) => {
    return [
        {
            $match: {
                _id: listingId,
                ...buildListingFilterMatch(),
            },
        },
        ...buildBuildingFromListingLookupStages({
            preserveNullAndEmptyArrays: false,
            requireActive: true,
            includeRentSummary: true,
        }),
        ...buildAgentProfileFromListingLookupStages({
            removeAgentProfile: false,
            preserveNullAndEmptyArrays: false,
            requireActiveUser: true,
            requireAgentProfile: true,
        }),
        ...buildSavedListingLookupStages(viewerUserId),
    ];
};
