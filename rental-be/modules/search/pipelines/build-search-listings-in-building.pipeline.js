// modules/search/pipelines/build-search-listings-in-building.pipeline.js
import { buildSearchListingsPipeline } from "./helpers/index.js";

export const buildSearchListingsInBuildingPipeline = ({
    buildingId,
    filters,
    page = 1,
    limit = 20,
    viewerUserId = null,
}) => {
    return buildSearchListingsPipeline({
        match: { buildingId },
        filters,
        page,
        limit,
        includeAgentProfile: true,
        removeAgentProfile: false,
        preserveNullAndEmptyArrays: false,
        requireActiveUser: true,
        viewerUserId,
    });
};
