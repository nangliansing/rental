// modules/listing/utils/build-owner-listing-sort.js
import {
  LISTING_AVAILABILITY_FILTERS,
  OWNER_LISTING_SORTS,
} from "../listing.constants.js";

const buildCreatedAtTieBreakerSort = (sort) => {
  if (sort === OWNER_LISTING_SORTS.OLDEST) {
    return { createdAt: 1, _id: -1 };
  }

  return { createdAt: -1, _id: 1 };
};

/**
 * Builds Mongo sort fields for GET /api/v1/listings.
 * "soon" prioritizes availability date; other filters sort by listing creation time.
 */
export const buildOwnerListingSort = ({ filter, sort }) => {
  const tieBreaker = buildCreatedAtTieBreakerSort(sort);

  if (filter === LISTING_AVAILABILITY_FILTERS.SOON) {
    return {
      availableAt: 1,
      ...tieBreaker,
    };
  }

  return tieBreaker;
};
