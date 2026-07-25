// Done
// modules/search/pipelines/helpers/build-building-match-stages.js
import { buildBuildingSearchMatch } from "./build-building-search-match.js";

export const buildBuildingMatchStages = ({
    match = {},
    filters = {},
    requireAvailableListings = false,
} = {}) => {
    return [
        {
            $match: buildBuildingSearchMatch({
                match,
                filters,
                requireAvailableListings,
            }),
        },
    ];
};
