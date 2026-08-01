import { deliverNotifications } from "../../notification/services/deliver-notifications.service.js";
import { getWorkerRuntimeContext } from "../../../shared/queue/worker-context.js";
import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../building-follow-notify.constants.js";
import { validateBuildingFollowersNotifyEvent } from "../validate-building-followers-notify-event.js";
import { buildFollowerDedupeKey } from "../utils/build-follower-dedupe-key.js";
import { buildFollowerNotificationContent } from "../utils/build-follower-notification-content.js";
import {
  filterEligibleListingsForFollower,
  shouldExcludeFollower,
} from "../utils/merge-building-followers-notify-job-data.js";
import { paginateBuildingFollowers } from "../utils/paginate-building-followers.js";
import {
  isBuildingFollowersNotifyEventStillValid,
  refreshListingBatchMetadata,
  refreshPriceDropMetadata,
  resolveBuildingNameForFollowerNotify,
} from "../utils/verify-building-followers-notify-event.js";

const buildRecipientsForFollowers = ({
  followers,
  event,
  eligibleListings,
}) => {
  const recipients = [];
  const isListingBatchEvent =
    event.changeType === BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING ||
    event.changeType === BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN;

  for (const follower of followers) {
    const userId = follower.userId?.toString();

    if (
      !userId ||
      shouldExcludeFollower(userId, {
        excludeUserIds: event.excludeUserIds.map((id) => id.toString()),
      })
    ) {
      continue;
    }

    if (!isListingBatchEvent) {
      recipients.push({
        userId,
        dedupeKey: buildFollowerDedupeKey({
          changeType: event.changeType,
          buildingId: event.buildingId,
          userId,
          newMinRent: event.metadata?.newMinRent ?? null,
        }),
        notification: buildFollowerNotificationContent({
          event,
          listings: [],
        }),
      });
      continue;
    }

    const followerListings = filterEligibleListingsForFollower(
      follower,
      eligibleListings,
    ).filter(
      (listing) =>
        !listing.excludeUserId ||
        listing.excludeUserId.toString() !== userId,
    );

    if (followerListings.length === 0) {
      continue;
    }

    recipients.push({
      userId,
      dedupeKey: buildFollowerDedupeKey({
        changeType: event.changeType,
        buildingId: event.buildingId,
        userId,
        listings: followerListings,
      }),
      notification: buildFollowerNotificationContent({
        event,
        listings: followerListings,
      }),
    });
  }

  return recipients;
};

export const handleBuildingFollowersNotifyJob = async (job) => {
  const workerContext = getWorkerRuntimeContext();
  const logger = workerContext?.logger ?? null;

  const event = validateBuildingFollowersNotifyEvent(job.data ?? {});

  const stillValid = await isBuildingFollowersNotifyEventStillValid(event);

  if (!stillValid) {
    logger?.info?.(
      {
        event: "building_followers_notify_skipped_stale",
        changeType: event.changeType,
        buildingId: event.buildingId.toString(),
        listingCount: event.listings.length,
        jobId: job.id,
      },
      "Skipped stale building follower notification job",
    );

    return {
      ok: true,
      skipped: true,
      reason: "stale_event",
    };
  }

  const buildingName = await resolveBuildingNameForFollowerNotify(event);
  let metadata = {
    ...event.metadata,
    buildingName: buildingName ?? event.metadata.buildingName ?? null,
  };
  let eligibleListings = [];

  if (
    event.changeType === BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING ||
    event.changeType === BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN
  ) {
    eligibleListings = await refreshListingBatchMetadata(event);

    if (eligibleListings.length === 0) {
      return {
        ok: true,
        skipped: true,
        reason: "stale_event",
      };
    }
  }

  if (event.changeType === BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED) {
    metadata = await refreshPriceDropMetadata(event);
    metadata.buildingName = buildingName ?? metadata.buildingName ?? null;
  }

  const notificationEvent = {
    ...event,
    metadata,
  };

  const publishRealtimeHint = workerContext?.publishRealtimeHint ?? null;

  let requested = 0;
  let sent = 0;
  let skippedDuplicate = 0;
  let skippedInvalid = 0;
  let realtimePublished = 0;
  let realtimeFailed = 0;
  const notificationIds = [];

  for await (const followers of paginateBuildingFollowers(event.buildingId, {
    followedBefore: event.occurredAt,
  })) {
    const recipients = buildRecipientsForFollowers({
      followers,
      event: notificationEvent,
      eligibleListings,
    });

    if (recipients.length === 0) {
      continue;
    }

    requested += recipients.length;

    const result = await deliverNotifications({
      recipients,
      publishRealtimeHint,
      logger,
    });

    sent += result.sent;
    skippedDuplicate += result.skippedDuplicate;
    skippedInvalid += result.skippedInvalid;
    realtimePublished += result.realtimePublished;
    realtimeFailed += result.realtimeFailed;
    notificationIds.push(...result.notificationIds);
  }

  logger?.info?.(
    {
      event: "building_followers_notify_completed",
      changeType: event.changeType,
      buildingId: event.buildingId.toString(),
      listingCount: eligibleListings.length,
      requested,
      sent,
      skippedDuplicate,
      skippedInvalid,
      realtimePublished,
      realtimeFailed,
      jobId: job.id,
    },
    "Completed building follower notification job",
  );

  return {
    ok: true,
    skipped: false,
    changeType: event.changeType,
    listingCount: eligibleListings.length,
    requested,
    sent,
    skippedDuplicate,
    skippedInvalid,
    realtimePublished,
    realtimeFailed,
    notificationIds,
  };
};
