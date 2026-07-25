import {
  validateLimit,
  validateMongooseId,
  validateObject,
  validatePage,
} from "../../shared/validators/index.js";

export const validateSavedListingListingId = (input) => {
  return validateMongooseId(input, "listingId", {
    asObjectId: true,
  });
};

export const buildSearchSavedListingsParams = (queryInput = {}) => {
  validateObject(queryInput, "query");

  return {
    page: validatePage(queryInput.page),
    limit: validateLimit(queryInput.limit),
  };
};
