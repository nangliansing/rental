// modules/search/params/build-search-listings-by-agent-params.js
import {
    validateLimit,
    validateMongooseId,
    validateObject,
    validatePage,
} from "../../../shared/validators/index.js";
import {
    validateListingAvailabilityFilter,
    validateOwnerListingSort,
} from "../../listing/listing.validation.js";

export const buildSearchListingsByAgentParams = (
    paramsInput,
    queryInput
) => {
    validateObject(paramsInput, "params");
    validateObject(queryInput, "query");

    return {
        agentProfileId: validateMongooseId(
            paramsInput.agentProfileId,
            "agentProfileId",
            { asObjectId: true }
        ),
        page: validatePage(queryInput.page),
        limit: validateLimit(queryInput.limit),
        filter: validateListingAvailabilityFilter(queryInput.filter),
        sort: validateOwnerListingSort(queryInput.sort),
    };
};
