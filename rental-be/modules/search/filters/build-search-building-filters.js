// modules/search/filters/build-search-building-filters.js
import {
    validateBuildingType,
    validateFacilities as validateBuildingFacilities,
    validateSecurity,
} from "../../building/building.validation.js";

import { setArrayIfNotEmpty } from "./helpers/index.js";

export const buildSearchBuildingFilters = (body) => {
    const filters = {};

    if (body.buildingType !== undefined) {
        filters.buildingType = validateBuildingType(body.buildingType);
    }

    if (body.buildingFacilities !== undefined) {
        setArrayIfNotEmpty(
            filters,
            "buildingFacilities",
            validateBuildingFacilities(body.buildingFacilities)
        );
    }

    if (body.security !== undefined) {
        setArrayIfNotEmpty(filters, "security", validateSecurity(body.security));
    }

    return filters;
};