import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../building-follow-notify.constants.js";
import { isNotifyEligibleListing } from "../utils/is-notify-eligible-listing.js";

export const detectNewPublicListing = ({ listing, buildingId, buildingName }) => {
  if (!isNotifyEligibleListing(listing)) {
    return null;
  }

  const resolvedBuildingId = buildingId ?? listing.buildingId;

  if (!resolvedBuildingId) {
    return null;
  }

  const listingId = listing._id ?? listing.id;

  if (!listingId) {
    return null;
  }

  return {
    changeType: BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING,
    buildingId: resolvedBuildingId,
    listingId,
    buildingName: buildingName ?? null,
    rent:
      typeof listing.rent === "number" && Number.isFinite(listing.rent)
        ? listing.rent
        : null,
    availableAt: listing.availableAt ?? null,
    excludeUserId: listing.listedBy ?? null,
  };
};
