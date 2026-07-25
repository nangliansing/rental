// modules/search/params/build-search-buildings-in-map-params.js
import {
    validateMapBounds,
    validateObject,
    validatePage,
    validateLimit,
    validateBoolean,
} from "../../../shared/validators/index.js";

import { buildSearchFilters } from "../filters/index.js";

export const buildSearchBuildingsInMapParams = (body) => {
    validateObject(body, "body");

    return {
        bounds: validateMapBounds(body.bounds, "bounds"),
        filters: buildSearchFilters(body),
        page: validatePage(body.page),
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