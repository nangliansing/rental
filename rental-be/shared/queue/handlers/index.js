import { JOB_NAMES } from "../constants.js";
import { registerJobHandler } from "./registry.js";
import { handleSystemPingJob } from "./system/ping.handler.js";
import {
  handleBuildingFollowerAvailableAgainJob,
  handleBuildingFollowerNewListingJob,
  handleBuildingFollowerPriceDropJob,
  handleBuildingFollowersNotifyJob,
} from "../../../modules/building-follow-notify/handlers/building-followers-notify.handler.js";

export const registerDefaultJobHandlers = () => {
  registerJobHandler(JOB_NAMES.SYSTEM_PING, handleSystemPingJob);
  registerJobHandler(
    JOB_NAMES.BUILDING_FOLLOWERS_NOTIFY,
    handleBuildingFollowersNotifyJob,
  );
  registerJobHandler(
    JOB_NAMES.BUILDING_FOLLOWERS_PRICE_DROP,
    handleBuildingFollowerPriceDropJob,
  );
  registerJobHandler(
    JOB_NAMES.BUILDING_FOLLOWERS_NEW_LISTING,
    handleBuildingFollowerNewListingJob,
  );
  registerJobHandler(
    JOB_NAMES.BUILDING_FOLLOWERS_AVAILABLE_AGAIN,
    handleBuildingFollowerAvailableAgainJob,
  );
};

export { handleSystemPingJob } from "./system/ping.handler.js";
export {
  handleBuildingFollowerAvailableAgainJob,
  handleBuildingFollowerNewListingJob,
  handleBuildingFollowerPriceDropJob,
  handleBuildingFollowersNotifyJob,
} from "../../../modules/building-follow-notify/handlers/building-followers-notify.handler.js";
