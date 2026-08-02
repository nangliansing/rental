// modules/search/services/search-listing-by-id.service.js
import { AppError } from "../../../shared/errors/app-error.js";
import { validateNullableObject } from "../../../shared/validators/index.js";

import Listing from "../../listing/listing.model.js";
import { enrichListingWithBuildingFollowState } from "../../building-follow/utils/index.js";
import { serializeListingPayloadForApi, isListingOwnedByViewer } from "../../listing/utils/index.js";
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
    const normalizedViewerUserId = normalizeOptionalViewerId(viewerUserId);
    const pipeline = buildSearchListingByIdPipeline({
        ...params,
        viewerUserId: normalizedViewerUserId,
    });

    let query = Listing.aggregate(pipeline);

    if (session) {
        query = query.session(session);
    }

    const [listing] = await query;

    if (!listing) {
        throw new AppError("Listing not found", 404, "LISTING_NOT_FOUND");
    }

    const listingWithBuildingFollowState =
        await enrichListingWithBuildingFollowState({
            listing,
            viewerUserId: normalizedViewerUserId,
            session,
        });

    const includePrivateNote = isListingOwnedByViewer(
        listingWithBuildingFollowState,
        normalizedViewerUserId,
    );

    return serializeListingPayloadForApi(
        {
            listing: listingWithBuildingFollowState,
        },
        { includePrivateNote },
    );
};
