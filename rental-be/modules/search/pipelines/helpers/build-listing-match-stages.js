// modules/search/pipelines/helpers/build-listing-match-stages.js
import { buildListingFilterMatch } from "./build-listing-filter-match.js";

export const buildListingMatchStages = ({
    match = {},
    filters = {},
} = {}) => {
    return [
        {
            $match: {
                ...match,
                ...buildListingFilterMatch(filters),
            },
        },
    ];
};