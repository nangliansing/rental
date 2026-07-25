// modules/building/services/update-building-rent-summary.service.js
import {
    validateMongooseId,
    validateNullableObject,
} from "../../../shared/validators/index.js";

import Building from "../building.model.js";
import Listing from "../../listing/listing.model.js";
import { LISTING_VISIBILITIES } from "../../listing/listing.constants.js";

export const updateBuildingRentSummaryService = async (
    buildingId,
    session = null
) => {
    validateNullableObject(session, "session");

    const validatedBuildingId = validateMongooseId(buildingId, "buildingId", {
        asObjectId: true,
    });

    const pipeline = [
        {
            $match: {
                buildingId: validatedBuildingId,
                isDeleted: false,
                visibility: LISTING_VISIBILITIES.PUBLIC,
            },
        },
        {
            $group: {
                _id: "$buildingId",
                minRent: { $min: "$rent" },
                maxRent: { $max: "$rent" },
            },
        },
    ];

    let aggregateQuery = Listing.aggregate(pipeline);

    if (session) {
        aggregateQuery = aggregateQuery.session(session);
    }

    const [summary] = await aggregateQuery;

    let query = Building.findByIdAndUpdate(
        validatedBuildingId,
        {
            $set: {
                minRent: summary?.minRent ?? null,
                maxRent: summary?.maxRent ?? null,
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

    return query;
};