// modules/search/services/search-buildings-in-map.service.js
import { validateNullableObject } from "../../../shared/validators/index.js";

import { buildSearchBuildingsInMapParams } from "../params/index.js";
import { buildSearchBuildingsInMapPipeline } from "../pipelines/index.js";
import { applyAgentProfileListingFilter } from "./apply-agent-profile-listing-filter.js";
import { executePaginatedBuildingSearch } from "./execute-paginated-building-search.js";
import { normalizeOptionalViewerId } from "./normalize-optional-viewer-id.js";

export const searchBuildingsInMapService = async ({
    bodyInput,
    viewerUserId = null,
    session = null
}) => {
    validateNullableObject(session, "session");

    const params = buildSearchBuildingsInMapParams(bodyInput);
    const searchParams = await applyAgentProfileListingFilter(params, session);
    const pipeline = buildSearchBuildingsInMapPipeline({
        ...searchParams,
        viewerUserId: normalizeOptionalViewerId(viewerUserId),
    });

    return executePaginatedBuildingSearch({
        pipeline,
        page: searchParams.page,
        limit: searchParams.limit,
        session,
    });
};
