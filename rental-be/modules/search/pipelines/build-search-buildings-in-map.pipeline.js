// modules/search/pipelines/build-search-buildings-in-map.pipeline.js
import { buildBoundsPolygon } from "../../../shared/geo/index.js";
import { buildSearchBuildingsPipeline } from "./helpers/index.js";

export const buildSearchBuildingsInMapPipeline = ({
    bounds,
    filters,
    page = 1,
    limit = 20,
    includeBuildingsWithoutMatchingListings = false,
    viewerUserId = null,
}) => {
    return buildSearchBuildingsPipeline({
        match: {
            location: {
                $geoWithin: {
                    $geometry: buildBoundsPolygon(bounds),
                },
            },
        },
        filters,
        page,
        limit,
        includeBuildingsWithoutMatchingListings,
        viewerUserId,
    });
};
