// modules/building/services/update-building-rent-summary.service.js
import {
    validateMongooseId,
    validateNullableObject,
} from "../../../shared/validators/index.js";

import Building from "../building.model.js";
import Listing from "../../listing/listing.model.js";
import { LISTING_VISIBILITIES } from "../../listing/listing.constants.js";
import { maybeEnqueueBuildingFollowerPriceDrop } from "../../building-follow-notify/services/enqueue-building-followers-notify.service.js";

const computeRentSummary = (listings) => {
    const rents = listings
        .map((listing) => listing.rent)
        .filter((rent) => typeof rent === "number" && Number.isFinite(rent) && rent > 0);

    if (rents.length === 0) {
        return { minRent: null, maxRent: null };
    }

    return {
        minRent: Math.min(...rents),
        maxRent: Math.max(...rents),
    };
};

export const updateBuildingRentSummaryService = async (
    buildingId,
    session = null,
    { logger = null } = {},
) => {
    validateNullableObject(session, "session");

    const validatedBuildingId = validateMongooseId(buildingId, "buildingId", {
        asObjectId: true,
    });

    let existingBuildingQuery = Building.findById(validatedBuildingId).select(
        "minRent name",
    );

    if (session) {
        existingBuildingQuery = existingBuildingQuery.session(session);
    }

    const existingBuilding = await existingBuildingQuery;
    const previousMinRent = existingBuilding?.minRent ?? null;

    // Use find() instead of aggregate() so transactional listing updates are
    // visible when this runs inside the same MongoDB session.
    let listingsQuery = Listing.find({
        buildingId: validatedBuildingId,
        isDeleted: false,
        visibility: LISTING_VISIBILITIES.PUBLIC,
    }).select("rent");

    if (session) {
        listingsQuery = listingsQuery.session(session);
    }

    const listings = await listingsQuery.lean();
    const { minRent, maxRent } = computeRentSummary(listings);

    let query = Building.findByIdAndUpdate(
        validatedBuildingId,
        {
            $set: {
                minRent,
                maxRent,
            },
        },
        {
            returnDocument: "after",
            runValidators: true,
        }
    );

    if (session) {
        query = query.session(session);
    }

    const updatedBuilding = await query;
    const currentMinRent = updatedBuilding?.minRent ?? null;

    if (!session?.inTransaction?.()) {
        await maybeEnqueueBuildingFollowerPriceDrop({
            buildingId: validatedBuildingId,
            buildingName: updatedBuilding?.name ?? existingBuilding?.name ?? null,
            oldMinRent: previousMinRent,
            newMinRent: currentMinRent,
            occurredAt: new Date(),
            logger,
        });
    }

    return updatedBuilding;
};
