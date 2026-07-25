// modules/building/mappers/build-update-building-record.js
import { validateObject } from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";

import {
    validateName,
    validateIsActive,
    validateBuildingType,
    validateFacilities,
    validateSecurity,
    validateBuildingLocation,
    validateAddress,
    validateUpdatedBy,
} from "../building.validation.js";

export const buildUpdateBuildingRecord = (body, actorId) => {
    validateObject(body, "body");

    const update = {};

    if (body.name !== undefined) {
        update.name = validateName(body.name);
    }

    if (body.isActive !== undefined) {
        update.isActive = validateIsActive(body.isActive);
    }

    if (body.buildingType !== undefined) {
        update.buildingType = validateBuildingType(body.buildingType);
    }

    if (body.facilities !== undefined) {
        update.facilities = validateFacilities(body.facilities);
    }

    if (body.security !== undefined) {
        update.security = validateSecurity(body.security);
    }

    if (body.location !== undefined) {
        update.location = validateBuildingLocation(body.location);
    }

    if (body.address !== undefined) {
        update.address = validateAddress(body.address);
    }

    if (Object.keys(update).length === 0) {
        throw new AppError(
            "No valid fields provided for update",
            422,
            "VALIDATION_ERROR"
        );
    }

    update.updatedBy = validateUpdatedBy(actorId);

    return update;
};