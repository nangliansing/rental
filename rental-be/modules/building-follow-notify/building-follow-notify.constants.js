export const BUILDING_FOLLOWER_CHANGE_TYPES = Object.freeze({
  PRICE_DROPPED: "PRICE_DROPPED",
  NEW_LISTING: "NEW_LISTING",
  AVAILABLE_AGAIN: "AVAILABLE_AGAIN",
});

/** @deprecated Use BUILDING_FOLLOWER_JOB_NAME_BY_CHANGE_TYPE. */
export const BUILDING_FOLLOWERS_NOTIFY_JOB_NAME = "building.followers.notify";

export const BUILDING_FOLLOWER_JOB_NAME_BY_CHANGE_TYPE = Object.freeze({
  [BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED]: "building.followers.price.drop",
  [BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING]: "building.followers.new.listing",
  [BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN]:
    "building.followers.available.again",
});

export const resolveBuildingFollowerNotifyJobName = (changeType) => {
  const jobName = BUILDING_FOLLOWER_JOB_NAME_BY_CHANGE_TYPE[changeType];

  if (!jobName) {
    throw new Error(`Unsupported follower change type: ${changeType}`);
  }

  return jobName;
};

export const BUILDING_FOLLOWERS_NOTIFY_DEBOUNCE_MS = Number.parseInt(
  process.env.BUILDING_FOLLOWERS_NOTIFY_DEBOUNCE_MS ?? "",
  10,
) || 5 * 60 * 1000;

export const BUILDING_FOLLOWERS_MIN_PRICE_DROP_BAHT = 100;

export const BUILDING_FOLLOWERS_PAGE_SIZE = 200;

export const BUILDING_FOLLOWERS_MAX_LISTINGS_PER_JOB = 100;

export const BUILDING_FOLLOWERS_DEDUPE_PREFIX = "followed-building";
