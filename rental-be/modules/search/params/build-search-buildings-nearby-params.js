// modules/search/params/build-search-buildings-nearby-params.js
import {
    validateBoolean,
    validateDistanceMeters,
    validateLimit,
    validateNumberRange,
    validateObject,
} from "../../../shared/validators/index.js";

import { buildSearchFilters } from "../filters/index.js";

const DEFAULT_RADIUS_METERS = 300;
const MAX_RADIUS_METERS = 2000;

function validatePosition(input) {
    validateObject(input, "position");

    const lat = validateNumberRange(input.lat, "position.lat", -90, 90);
    const lng = validateNumberRange(input.lng, "position.lng", -180, 180);

    return { lat, lng };
}

export const buildSearchBuildingsNearbyParams = (body) => {
    validateObject(body, "body");

    return {
        position: validatePosition(body.position),
        radiusMeters: validateDistanceMeters(body.radiusMeters, "radiusMeters", {
            defaultValue: DEFAULT_RADIUS_METERS,
            maxValue: MAX_RADIUS_METERS,
        }),
        filters: buildSearchFilters(body),
        limit: validateLimit(body.limit),
        includeBuildingsWithoutMatchingListings:
            body.includeBuildingsWithoutMatchingListings === undefined
                ? false
                : validateBoolean(
                    body.includeBuildingsWithoutMatchingListings,
                    "includeBuildingsWithoutMatchingListings"
                ),
    };
};
