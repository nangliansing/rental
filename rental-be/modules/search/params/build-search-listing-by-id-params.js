// modules/search/params/build-search-listing-by-id-params.js
import {
    validateMongooseId,
    validateObject,
} from "../../../shared/validators/index.js";

export const buildSearchListingByIdParams = (paramsInput) => {
    validateObject(paramsInput, "params");

    return {
        listingId: validateMongooseId(paramsInput.listingId, "listingId", {
            asObjectId: true,
        }),
    };
};