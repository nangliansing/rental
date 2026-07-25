// modules/listing/services/owner-search-listing-by-id.service.js
import { AppError } from "../../../shared/errors/app-error.js";
import {
    validateMongooseId,
    validateNullableObject,
    validateObject,
} from "../../../shared/validators/index.js";

import Listing from "../listing.model.js";
import { buildOwnerSearchListingByIdPipeline } from "../pipelines/index.js";
import { buildOwnerListingAgentProfileQuery } from "./build-owner-listing-agent-profile-query.js";

export const ownerSearchListingByIdService = async ({
    paramsInput,
    actorId,
    session = null,
}) => {
    validateNullableObject(session, "session");
    const params = validateObject(paramsInput, "params");

    const listingId = validateMongooseId(params.listingId, "listingId", {
        asObjectId: true,
    });

    const listedBy = validateMongooseId(actorId, "listedBy", {
        asObjectId: true,
    });

    const pipeline = buildOwnerSearchListingByIdPipeline({
        match: {
            _id: listingId,
            listedBy,
            isDeleted: false,
        },
        viewerUserId: listedBy,
    });

    const agentProfileQuery = buildOwnerListingAgentProfileQuery({
        userId: listedBy,
        session,
    });

    let listingQuery = Listing.aggregate(pipeline);

    if (session) {
        listingQuery = listingQuery.session(session);
    }

    const [agentProfile, [listing]] = await Promise.all([
        agentProfileQuery,
        listingQuery,
    ]);

    if (!listing) {
        throw new AppError("Listing not found", 404, "LISTING_NOT_FOUND");
    }

    return {
        agentProfile,
        listing,
    };
};
