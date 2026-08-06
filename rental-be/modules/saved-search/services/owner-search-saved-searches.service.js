import { normalizePagination } from "../../../shared/utils/index.js";
import { enrichOpportunitiesWithMatchingBuildingCounts } from "../../agent-demand-opportunity/services/enrich-opportunities-with-matching-building-counts.service.js";
import {
  validateLimit,
  validateMongooseId,
  validateNullableObject,
  validateObject,
  validatePage,
} from "../../../shared/validators/index.js";

import { SAVED_SEARCH_STATUSES } from "../saved-search.constants.js";
import { validateSavedSearchStatus } from "../saved-search.validation.js";
import SavedSearch from "../saved-search.model.js";
import { buildOwnerSearchSavedSearchesPipeline } from "../pipelines/index.js";
import { buildOwnerSavedSearchListMatch } from "../utils/index.js";

export const ownerSearchSavedSearchesService = async ({
  queryInput,
  actorId,
  session = null,
}) => {
  validateNullableObject(session, "session");
  const query = validateObject(queryInput, "query");

  const createdBy = validateMongooseId(actorId, "createdBy", {
    asObjectId: true,
  });
  const page = validatePage(query.page);
  const limit = validateLimit(query.limit);
  const skip = (page - 1) * limit;
  const status =
    validateSavedSearchStatus(query.status) ??
    SAVED_SEARCH_STATUSES.WAITING;

  const match = buildOwnerSavedSearchListMatch({
    actorId: createdBy,
    status,
  });

  const pipeline = buildOwnerSearchSavedSearchesPipeline({
    match,
    page,
    skip,
    limit,
    includeCoverage: status === SAVED_SEARCH_STATUSES.WAITING,
  });

  let savedSearchesQuery = SavedSearch.aggregate(pipeline);

  if (session) {
    savedSearchesQuery = savedSearchesQuery.session(session);
  }

  const [result] = await savedSearchesQuery;
  const savedSearches = result?.data ?? [];
  const enrichedSavedSearches =
    status === SAVED_SEARCH_STATUSES.WAITING
      ? await enrichOpportunitiesWithMatchingBuildingCounts({
          opportunities: savedSearches,
          callerUserId: createdBy,
          session,
        })
      : savedSearches;

  return {
    savedSearches: enrichedSavedSearches,
    pagination: normalizePagination(result?.pagination, page, limit),
  };
};
