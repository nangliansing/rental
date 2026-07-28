// modules/listing/services/admin-create-listing.service.js
import { validateNullableObject } from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import { updateBuildingRentSummaryService } from "../../building/services/index.js";
import { buildCreateListingRecord } from "../mappers/index.js";
import Building from "../../building/building.model.js";
import Listing from "../listing.model.js";
import { serializeListingDocumentForApi } from "../utils/index.js";

export const adminCreateListingService = async (
    body,
    actorId,
    session = null
) => {
    validateNullableObject(session, "session");

    const record = buildCreateListingRecord(body, actorId);

    let buildingQuery = Building.findById(record.buildingId);

    if (session) {
        buildingQuery = buildingQuery.session(session);
    }

    const building = await buildingQuery;

    if (!building) {
        throw new AppError("Building not found", 404, "BUILDING_NOT_FOUND");
    }

    if (building.isActive === false) {
        throw new AppError("Building is inactive", 422, "BUILDING_INACTIVE");
    }

    const [listing] = await Listing.create(
        [record],
        session ? { session } : undefined
    );

    await updateBuildingRentSummaryService(record.buildingId, session);

    return serializeListingDocumentForApi(listing);
};