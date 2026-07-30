// modules/listing/utils/apply-owner-listing-filter-to-match.js
import {
  OWNER_LISTING_VISIBILITY_FILTERS,
} from "../listing.constants.js";
import {
  validateOwnerListingFilter,
  validateOwnerListingVisibilityFilter,
} from "../listing.validation.js";
import { buildOwnerListingFilterMatch } from "./build-owner-listing-filter-match.js";

const hasFilterQuery = (query) =>
  query.filter != null && String(query.filter).trim() !== "";

/**
 * Applies owner listing tab filters to a Mongo match object.
 * `filter` takes precedence; legacy `visibility` remains for older clients.
 */
export const applyOwnerListingFilterToMatch = (
  match,
  query,
  referenceDate = new Date(),
) => {
  if (hasFilterQuery(query)) {
    const filter = validateOwnerListingFilter(query.filter);
    Object.assign(match, buildOwnerListingFilterMatch(filter, referenceDate));
    return;
  }

  const visibility = validateOwnerListingVisibilityFilter(query.visibility);

  if (visibility === OWNER_LISTING_VISIBILITY_FILTERS.PRIVATE) {
    match.visibility = visibility;
    return;
  }

  if (visibility === OWNER_LISTING_VISIBILITY_FILTERS.PUBLIC) {
    match.visibility = visibility;
  }
};
