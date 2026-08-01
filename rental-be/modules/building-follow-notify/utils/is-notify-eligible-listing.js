import { LISTING_VISIBILITIES } from "../../listing/listing.constants.js";

export const isNotifyEligibleListing = (listing) => {
  if (!listing || listing.isDeleted === true) {
    return false;
  }

  return listing.visibility === LISTING_VISIBILITIES.PUBLIC;
};
