// modules/saved-listing/services/search-saved-listings.service.js
import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";
import { normalizePagination } from "../../../shared/utils/index.js";

import SavedListing from "../saved-listing.model.js";
import { serializeListingPayloadForApi } from "../../listing/utils/index.js";
import { buildSearchSavedListingsParams } from "../saved-listing.validation.js";
import { buildSearchSavedListingsPipeline } from "../pipelines/index.js";

export const searchSavedListingsService = async ({
  actorId,
  queryInput = {},
  session = null,
}) => {
  validateNullableObject(session, "session");

  const userId = validateMongooseId(actorId, "userId", { asObjectId: true });
  const params = buildSearchSavedListingsParams(queryInput);

  const pipeline = buildSearchSavedListingsPipeline({
    userId,
    page: params.page,
    limit: params.limit,
  });

  let savedListingsQuery = SavedListing.aggregate(pipeline);

  if (session) {
    savedListingsQuery = savedListingsQuery.session(session);
  }

  const [result] = await savedListingsQuery;

  return serializeListingPayloadForApi({
    savedListings: result?.data ?? [],
    pagination: normalizePagination(
      result?.pagination,
      params.page,
      params.limit,
    ),
  });
};
