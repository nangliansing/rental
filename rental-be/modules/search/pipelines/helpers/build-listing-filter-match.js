// modules/search/pipelines/helpers/build-listing-filter-match.js
import {
  KITCHEN_TYPES,
  LISTING_VISIBILITIES,
} from "../../../listing/listing.constants.js";

export const buildListingFilterMatch = (filters = {}) => {
  const match = {
    isDeleted: false,
    visibility: LISTING_VISIBILITIES.PUBLIC,
  };

  if (filters.minRent !== undefined || filters.maxRent !== undefined) {
    match.rent = {};

    if (filters.minRent !== undefined) {
      match.rent.$gte = filters.minRent;
    }

    if (filters.maxRent !== undefined) {
      match.rent.$lte = filters.maxRent;
    }
  }

  if (filters.contractMonths !== undefined) {
    match.contractMonths = { $lte: filters.contractMonths };
  }

  if (filters.occupancy !== undefined) {
    match.occupancy = { $gte: filters.occupancy };
  }

  if (filters.isForeignerAccepted !== undefined) {
    match.isForeignerAccepted = filters.isForeignerAccepted;
  }

  if (filters.isTM30Provided !== undefined) {
    match.isTM30Provided = filters.isTM30Provided;
  }

  if (filters.bedroomCount !== undefined) {
    match.bedroomCount =
      filters.bedroomCount === 0 ? 0 : { $gte: filters.bedroomCount };
  }

  if (filters.bathroomCount !== undefined) {
    match.bathroomCount = { $gte: filters.bathroomCount };
  }

  if (filters.kitchenType !== undefined) {
    match.kitchenType =
      filters.kitchenType === KITCHEN_TYPES.KITCHEN
        ? { $in: [KITCHEN_TYPES.KITCHEN, KITCHEN_TYPES.SEPARATE_KITCHEN] }
        : filters.kitchenType;
  }

  if (filters.isCookingAllowed !== undefined) {
    match.isCookingAllowed = filters.isCookingAllowed;
  }

  if (filters.isPetAllowed !== undefined) {
    match.isPetAllowed = filters.isPetAllowed;
  }

  if (filters.listingFacilities !== undefined) {
    match.facilities = { $all: filters.listingFacilities };
  }

  if (filters.listedByUserIds !== undefined) {
    match.listedBy = { $in: filters.listedByUserIds };
  }

  return match;
};
