import { getWorkerRuntimeContext } from "../../../shared/queue/worker-context.js";
import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../building-follow-notify.constants.js";
import { validateBuildingFollowersNotifyEvent } from "../validate-building-followers-notify-event.js";
import { buildPriceDropRecipients } from "../utils/build-follower-recipients.js";
import { runFollowerDelivery } from "../utils/run-follower-delivery.js";
import {
  isPriceDropFollowerNotifyStillValid,
  refreshPriceDropMetadata,
  resolveBuildingNameForFollowerNotify,
} from "../utils/verify-building-followers-notify-event.js";

export const handleBuildingFollowerPriceDropJob = async (job) => {
  const workerContext = getWorkerRuntimeContext();
  const logger = workerContext?.logger ?? null;

  const event = validateBuildingFollowersNotifyEvent(job.data ?? {});

  if (event.changeType !== BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED) {
    throw new Error(
      `Expected PRICE_DROPPED job, received ${event.changeType}`,
    );
  }

  const stillValid = await isPriceDropFollowerNotifyStillValid(event);

  if (!stillValid) {
    logger?.info?.(
      {
        event: "building_followers_notify_skipped_stale",
        changeType: event.changeType,
        buildingId: event.buildingId.toString(),
        jobId: job.id,
      },
      "Skipped stale building price drop notification job",
    );

    return {
      ok: true,
      skipped: true,
      reason: "stale_event",
    };
  }

  const buildingName = await resolveBuildingNameForFollowerNotify(event);
  const metadata = await refreshPriceDropMetadata(event);

  metadata.buildingName = buildingName ?? metadata.buildingName ?? null;

  return runFollowerDelivery({
    event,
    changeType: event.changeType,
    listingCount: 0,
    metadata,
    buildRecipientsForPage: (followers, notificationEvent) =>
      buildPriceDropRecipients({ followers, event: notificationEvent }),
    logger,
    publishRealtimeHint: workerContext?.publishRealtimeHint ?? null,
    jobId: job.id,
  });
};
