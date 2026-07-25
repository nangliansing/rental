// modules/search/services/search-listings-in-building.service.js
import { AppError } from "../../../shared/errors/app-error.js";
import { normalizePagination } from "../../../shared/utils/index.js";
import { validateNullableObject } from "../../../shared/validators/index.js";

import Building from "../../building/building.model.js";
import Listing from "../../listing/listing.model.js";

import { buildSearchListingsInBuildingParams } from "../params/index.js";
import { buildSearchListingsInBuildingPipeline } from "../pipelines/index.js";
import { applyAgentProfileListingFilter } from "./apply-agent-profile-listing-filter.js";
import { normalizeOptionalViewerId } from "./normalize-optional-viewer-id.js";

export const searchListingsInBuildingService = async ({
    paramsInput,
    bodyInput,
    viewerUserId = null,
    session = null,
}) => {
    validateNullableObject(session, "session");

    const params = buildSearchListingsInBuildingParams(paramsInput, bodyInput);

    let buildingQuery = Building.findOne({
        _id: params.buildingId,
        isActive: true,
    }).select(
        "name buildingType facilities security location address minRent maxRent"
    );

    if (session) {
        buildingQuery = buildingQuery.session(session);
    }

    const building = await buildingQuery;

    if (!building) {
        throw new AppError("Building not found", 404, "BUILDING_NOT_FOUND");
    }

    const searchParams = await applyAgentProfileListingFilter(params, session);
    const pipeline = buildSearchListingsInBuildingPipeline({
        ...searchParams,
        viewerUserId: normalizeOptionalViewerId(viewerUserId),
    });

    let aggregateQuery = Listing.aggregate(pipeline);

    if (session) {
        aggregateQuery = aggregateQuery.session(session);
    }

    const [result] = await aggregateQuery;

    return {
        building,
        listings: result?.data ?? [],
        pagination: normalizePagination(
            result?.pagination,
            searchParams.page,
            searchParams.limit
        ),
    };
};
