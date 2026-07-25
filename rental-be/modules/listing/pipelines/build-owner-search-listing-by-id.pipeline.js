// modules/listing/pipelines/build-owner-search-listing-by-id.pipeline.js
import { buildSavedListingLookupStages } from "../../search/pipelines/helpers/index.js";
import { buildBuildingFromListingLookupStages } from "./helpers/index.js";

export const buildOwnerSearchListingByIdPipeline = ({
    match = {},
    viewerUserId = null,
}) => {
    return [
        { $match: match },
        ...buildBuildingFromListingLookupStages(),
        ...buildSavedListingLookupStages(viewerUserId),
    ];
};
