// modules/building/mappers/build-create-building-record.js
import { validateObject } from "../../../shared/validators/index.js";

import {
    validateName,
    validateBuildingType,
    validateFacilities,
    validateSecurity,
    validateBuildingLocation,
    validateAddress,
    validateCreatedBy,
} from "../building.validation.js";

export const buildCreateBuildingRecord = (body, actorId) => {
    validateObject(body, "body");

    return {
        name: validateName(body.name),
        isActive: true,

        buildingType: validateBuildingType(body.buildingType),
        facilities: validateFacilities(body.facilities),
        security: validateSecurity(body.security),

        location: validateBuildingLocation(body.location),
        address: validateAddress(body.address),

        minRent: null,
        maxRent: null,

        createdBy: validateCreatedBy(actorId),
        updatedBy: null,
    };
};