// modules/search/services/search-listing-by-id.service.js
import { AppError } from "../../../shared/errors/app-error.js";
import { validateNullableObject } from "../../../shared/validators/index.js";

import Listing from "../../listing/listing.model.js";
import { serializeListingPayloadForApi } from "../../listing/utils/index.js";
import { buildSearchListingByIdParams } from "../params/index.js";
import { buildSearchListingByIdPipeline } from "../pipelines/index.js";
import { normalizeOptionalViewerId } from "./normalize-optional-viewer-id.js";

export const searchListingByIdService = async ({
    paramsInput,
    viewerUserId = null,
    session = null,
}) => {
    validateNullableObject(session, "session");

    const params = buildSearchListingByIdParams(paramsInput);
    const pipeline = buildSearchListingByIdPipeline({
        ...params,
        viewerUserId: normalizeOptionalViewerId(viewerUserId),
    });

    let query = Listing.aggregate(pipeline);

    if (session) {
        query = query.session(session);
    }

    const [listing] = await query;

    if (!listing) {
        throw new AppError("Listing not found", 404, "LISTING_NOT_FOUND");
    }

    return serializeListingPayloadForApi({ listing });
};
