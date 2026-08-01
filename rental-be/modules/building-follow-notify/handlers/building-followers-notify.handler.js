import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../building-follow-notify.constants.js";
import { handleBuildingFollowerAvailableAgainJob } from "./available-again.handler.js";
import { handleBuildingFollowerNewListingJob } from "./new-listing.handler.js";
import { handleBuildingFollowerPriceDropJob } from "./price-drop.handler.js";
import { validateBuildingFollowersNotifyEvent } from "../validate-building-followers-notify-event.js";

/** @deprecated Routes legacy `building.followers.notify` jobs still in the queue. */
export const handleBuildingFollowersNotifyJob = async (job) => {
  const event = validateBuildingFollowersNotifyEvent(job.data ?? {});

  switch (event.changeType) {
    case BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED:
      return handleBuildingFollowerPriceDropJob(job);

    case BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING:
      return handleBuildingFollowerNewListingJob(job);

    case BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN:
      return handleBuildingFollowerAvailableAgainJob(job);

    default:
      throw new Error(`Unsupported follower change type: ${event.changeType}`);
  }
};

export { handleBuildingFollowerPriceDropJob } from "./price-drop.handler.js";
export { handleBuildingFollowerNewListingJob } from "./new-listing.handler.js";
export { handleBuildingFollowerAvailableAgainJob } from "./available-again.handler.js";
