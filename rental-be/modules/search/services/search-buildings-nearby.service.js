// modules/search/services/search-buildings-nearby.service.js
import { validateNullableObject } from "../../../shared/validators/index.js";

import Building from "../../building/building.model.js";
import { buildSearchBuildingsNearbyParams } from "../params/index.js";
import { buildSearchBuildingsNearbyPipeline } from "../pipelines/index.js";
import { applyAgentProfileListingFilter } from "./apply-agent-profile-listing-filter.js";
import { normalizeOptionalViewerId } from "./normalize-optional-viewer-id.js";

export const searchBuildingsNearbyService = async ({
    bodyInput,
    viewerUserId = null,
    session = null
}) => {
    validateNullableObject(session, "session");

    const params = buildSearchBuildingsNearbyParams(bodyInput);
    const searchParams = await applyAgentProfileListingFilter(params, session);
    const pipeline = buildSearchBuildingsNearbyPipeline({
        ...searchParams,
        viewerUserId: normalizeOptionalViewerId(viewerUserId),
    });

    let aggregateQuery = Building.aggregate(pipeline);

    if (session) {
        aggregateQuery = aggregateQuery.session(session);
    }

    const data = await aggregateQuery;

    return { data };
};
