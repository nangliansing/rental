import {
  BUILDING_FOLLOWER_CHANGE_TYPES,
  BUILDING_FOLLOWERS_DEDUPE_PREFIX,
} from "../building-follow-notify.constants.js";

const toIdString = (value) => {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toString();
};

const buildListingBatchKey = (listings) => {
  if (!Array.isArray(listings) || listings.length === 0) {
    return "empty";
  }

  const listingIds = listings
    .map((listing) => toIdString(listing.listingId))
    .filter(Boolean)
    .sort();

  if (listingIds.length === 0) {
    return "empty";
  }

  const joined = listingIds.join(".");

  if (joined.length <= 64) {
    return joined;
  }

  let hash = 0;

  for (const character of joined) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return `h${hash.toString(36)}`;
};

export const buildFollowerDedupeKey = ({
  changeType,
  buildingId,
  userId,
  newMinRent = null,
  listings = [],
}) => {
  const buildingKey = toIdString(buildingId);
  const userKey = toIdString(userId);

  switch (changeType) {
    case BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED: {
      const rentKey =
        typeof newMinRent === "number" && Number.isFinite(newMinRent)
          ? String(newMinRent)
          : "unknown";

      return `${BUILDING_FOLLOWERS_DEDUPE_PREFIX}.rent-drop.${buildingKey}.${userKey}.${rentKey}`;
    }

    case BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING:
      return `${BUILDING_FOLLOWERS_DEDUPE_PREFIX}.new-listing.${buildingKey}.${userKey}.${buildListingBatchKey(listings)}`;

    case BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN:
      return `${BUILDING_FOLLOWERS_DEDUPE_PREFIX}.available-again.${buildingKey}.${userKey}.${buildListingBatchKey(listings)}`;

    default:
      throw new Error(`Unsupported follower change type: ${changeType}`);
  }
};

export const buildBuildingFollowersNotifyJobId = (event) => {
  const buildingKey = toIdString(event.buildingId);

  switch (event.changeType) {
    case BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED:
      return `building.followers.notify-${buildingKey}-PRICE_DROPPED`;

    case BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING:
      return `building.followers.notify-${buildingKey}-NEW_LISTING`;

    case BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN:
      return `building.followers.notify-${buildingKey}-AVAILABLE_AGAIN`;

    default:
      throw new Error(`Unsupported follower change type: ${event.changeType}`);
  }
};
