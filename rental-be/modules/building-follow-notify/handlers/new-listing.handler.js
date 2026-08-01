import { getWorkerRuntimeContext } from "../../../shared/queue/worker-context.js";
import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../building-follow-notify.constants.js";
import { validateBuildingFollowersNotifyEvent } from "../validate-building-followers-notify-event.js";
import { buildListingBatchRecipients } from "../utils/build-follower-recipients.js";
import { runFollowerDelivery } from "../utils/run-follower-delivery.js";
import {
  isNewListingFollowerNotifyStillValid,
  refreshListingBatchMetadata,
  resolveBuildingNameForFollowerNotify,
} from "../utils/verify-building-followers-notify-event.js";

export const handleBuildingFollowerNewListingJob = async (job) => {
  const workerContext = getWorkerRuntimeContext();
  const logger = workerContext?.logger ?? null;

  const event = validateBuildingFollowersNotifyEvent(job.data ?? {});

  if (event.changeType !== BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING) {
    throw new Error(
      `Expected NEW_LISTING job, received ${event.changeType}`,
    );
  }

  const stillValid = await isNewListingFollowerNotifyStillValid(event);

  if (!stillValid) {
    logger?.info?.(
      {
        event: "building_followers_notify_skipped_stale",
        changeType: event.changeType,
        buildingId: event.buildingId.toString(),
        listingCount: event.listings.length,
        jobId: job.id,
      },
      "Skipped stale building new listing notification job",
    );

    return {
      ok: true,
      skipped: true,
      reason: "stale_event",
    };
  }

  const buildingName = await resolveBuildingNameForFollowerNotify(event);
  const eligibleListings = await refreshListingBatchMetadata(event);

  if (eligibleListings.length === 0) {
    return {
      ok: true,
      skipped: true,
      reason: "stale_event",
    };
  }

  const metadata = {
    ...event.metadata,
    buildingName: buildingName ?? event.metadata.buildingName ?? null,
  };

  return runFollowerDelivery({
    event,
    changeType: event.changeType,
    listingCount: eligibleListings.length,
    metadata,
    buildRecipientsForPage: (followers, notificationEvent) =>
      buildListingBatchRecipients({
        followers,
        event: notificationEvent,
        eligibleListings,
      }),
    logger,
    publishRealtimeHint: workerContext?.publishRealtimeHint ?? null,
    jobId: job.id,
  });
};
