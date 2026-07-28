// modules/listing/services/owner-search-listings.service.js
import { normalizePagination } from "../../../shared/utils/index.js";
import {
  validateLimit,
  validateMongooseId,
  validateNullableObject,
  validateObject,
  validatePage,
} from "../../../shared/validators/index.js";

import Listing from "../listing.model.js";
import { serializeListingPayloadForApi } from "../utils/index.js";
import { buildOwnerSearchListingsPipeline } from "../pipelines/index.js";
import { buildOwnerListingAgentProfileQuery } from "./build-owner-listing-agent-profile-query.js";
import {
  validateOwnerListingSort,
  validateOwnerListingVisibilityFilter,
} from "../listing.validation.js";
import {
  OWNER_LISTING_SORTS,
  OWNER_LISTING_VISIBILITY_FILTERS,
} from "../listing.constants.js";

const buildOwnerListingSort = (sort) => {
  if (sort === OWNER_LISTING_SORTS.OLDEST) {
    return { updatedAt: 1, _id: -1 };
  }

  return { updatedAt: -1, _id: 1 };
};

export const ownerSearchListingsService = async ({
  queryInput,
  actorId,
  session = null,
}) => {
  validateNullableObject(session, "session");
  const query = validateObject(queryInput, "query");

  const listedBy = validateMongooseId(actorId, "listedBy", {
    asObjectId: true,
  });

  const page = validatePage(query.page);
  const limit = validateLimit(query.limit);
  const visibility = validateOwnerListingVisibilityFilter(query.visibility);
  const sort = validateOwnerListingSort(query.sort);
  const skip = (page - 1) * limit;

  const match = {
    listedBy,
    isDeleted: false,
  };

  if (visibility !== OWNER_LISTING_VISIBILITY_FILTERS.ALL) {
    match.visibility = visibility;
  }

  const pipeline = buildOwnerSearchListingsPipeline({
    match,
    sort: buildOwnerListingSort(sort),
    page,
    skip,
    limit,
    viewerUserId: listedBy,
  });

  const agentProfileQuery = buildOwnerListingAgentProfileQuery({
    userId: listedBy,
    session,
  });

  let listingsQuery = Listing.aggregate(pipeline);

  if (session) {
    listingsQuery = listingsQuery.session(session);
  }

  const [agentProfile, [result]] = await Promise.all([
    agentProfileQuery,
    listingsQuery,
  ]);

  return serializeListingPayloadForApi({
    agentProfile,
    listings: result?.data ?? [],
    pagination: normalizePagination(result?.pagination, page, limit),
  });
};
