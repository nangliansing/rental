import { LISTING_VISIBILITIES } from "../../listing/listing.constants.js";
import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../building-follow-notify.constants.js";
import { isNotifyEligibleListing } from "../utils/is-notify-eligible-listing.js";
import {
  isListingAvailableNow,
  wasListingUnavailableNow,
} from "../utils/listing-availability-state.js";

export const detectListingAvailableAgain = ({
  before,
  after,
  referenceDate = new Date(),
}) => {
  if (!before || !after) {
    return null;
  }

  if (!isNotifyEligibleListing(after)) {
    return null;
  }

  const becamePublic =
    before.visibility === LISTING_VISIBILITIES.PRIVATE &&
    after.visibility === LISTING_VISIBILITIES.PUBLIC;

  const availabilityChanged =
    wasListingUnavailableNow(before.availableAt, referenceDate) &&
    isListingAvailableNow(after.availableAt, referenceDate);

  if (!becamePublic && !availabilityChanged) {
    return null;
  }

  const listingId = after._id ?? after.id;

  if (!listingId) {
    return null;
  }

  return {
    changeType: BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN,
    buildingId: after.buildingId,
    listingId,
    becamePublic,
    availabilityChanged,
    rent:
      typeof after.rent === "number" && Number.isFinite(after.rent)
        ? after.rent
        : null,
    availableAt: after.availableAt ?? null,
    excludeUserId: after.listedBy ?? null,
  };
};
