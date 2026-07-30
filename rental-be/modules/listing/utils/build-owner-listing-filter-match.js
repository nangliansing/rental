// modules/listing/utils/build-owner-listing-filter-match.js
import {
  LISTING_VISIBILITIES,
  OWNER_LISTING_FILTERS,
} from "../listing.constants.js";
import { buildListingAvailabilityFilterMatch } from "./build-listing-availability-filter-match.js";

/**
 * Returns Mongo match fields for GET /api/v1/listings?filter=...
 * Merge into the base owner match: { listedBy, isDeleted: false }.
 */
export const buildOwnerListingFilterMatch = (
  filter,
  referenceDate = new Date(),
) => {
  switch (filter) {
    case OWNER_LISTING_FILTERS.ALL:
      return {};

    case OWNER_LISTING_FILTERS.PRIVATE:
      return { visibility: LISTING_VISIBILITIES.PRIVATE };

    case OWNER_LISTING_FILTERS.NOW:
    case OWNER_LISTING_FILTERS.SOON:
      return {
        visibility: LISTING_VISIBILITIES.PUBLIC,
        ...buildListingAvailabilityFilterMatch(filter, referenceDate),
      };

    default:
      return {};
  }
};
