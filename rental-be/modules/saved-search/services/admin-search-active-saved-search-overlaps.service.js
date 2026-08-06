import { normalizePagination } from "../../../shared/utils/index.js";
import { AppError } from "../../../shared/errors/app-error.js";
import {
  validateLimit,
  validateNullableObject,
  validateObject,
  validatePage,
} from "../../../shared/validators/index.js";

import { SAVED_SEARCH_STATUSES } from "../saved-search.constants.js";
import { validateSavedSearchGeoSearch } from "../saved-search.validation.js";
import SavedSearch from "../saved-search.model.js";
import { buildSavedSearchCoverage } from "../utils/index.js";

export const adminSearchActiveSavedSearchOverlapsService = async ({
  body,
  session = null,
}) => {
  validateNullableObject(session, "session");
  const input = validateObject(body, "body");
  const unknownFields = Object.keys(input).filter(
    (field) => !["geoSearch", "page", "limit"].includes(field),
  );

  if (unknownFields.length) {
    throw new AppError(
      `Unknown fields: ${unknownFields.join(", ")}`,
      422,
      "VALIDATION_ERROR",
    );
  }
  const page = validatePage(input.page);
  const limit = validateLimit(input.limit);
  const coverage = buildSavedSearchCoverage(
    validateSavedSearchGeoSearch(input.geoSearch),
  );
  const match = {
    status: SAVED_SEARCH_STATUSES.WAITING,
    isDeleted: false,
    "geoSearch.coverage": {
      $geoIntersects: { $geometry: coverage },
    },
  };

  let dataQuery = SavedSearch.find(match)
    .select("-geoSearch.coverage")
    .sort({ createdAt: -1, _id: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  let countQuery = SavedSearch.countDocuments(match);

  if (session) {
    dataQuery = dataQuery.session(session);
    countQuery = countQuery.session(session);
  }

  const [savedSearches, total] = await Promise.all([dataQuery, countQuery]);

  return {
    savedSearches,
    pagination: normalizePagination({ total }, page, limit),
  };
};
