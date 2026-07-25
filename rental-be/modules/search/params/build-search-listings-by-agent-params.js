// modules/search/params/build-search-listings-by-agent-params.js
import {
    validateLimit,
    validateEnumValue,
    validateMongooseId,
    validateObject,
    validatePage,
} from "../../../shared/validators/index.js";
import { OWNER_LISTING_SORTS } from "../../listing/listing.constants.js";

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
        sort: validateEnumValue(
            queryInput.sort,
            "sort",
            Object.values(OWNER_LISTING_SORTS),
            OWNER_LISTING_SORTS.LATEST
        ),
    };
};
