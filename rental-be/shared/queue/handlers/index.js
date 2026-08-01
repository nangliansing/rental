import { JOB_NAMES } from "../constants.js";
import { registerJobHandler } from "./registry.js";
import { handleSystemPingJob } from "./system/ping.handler.js";
import { handleBuildingFollowersNotifyJob } from "../../../modules/building-follow-notify/handlers/building-followers-notify.handler.js";

export const registerDefaultJobHandlers = () => {
  registerJobHandler(JOB_NAMES.SYSTEM_PING, handleSystemPingJob);
  registerJobHandler(
    JOB_NAMES.BUILDING_FOLLOWERS_NOTIFY,
    handleBuildingFollowersNotifyJob,
  );
};

export { handleSystemPingJob } from "./system/ping.handler.js";
export { handleBuildingFollowersNotifyJob } from "../../../modules/building-follow-notify/handlers/building-followers-notify.handler.js";
