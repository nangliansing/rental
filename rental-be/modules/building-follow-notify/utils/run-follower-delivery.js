import { deliverNotifications } from "../../notification/services/deliver-notifications.service.js";
import { paginateBuildingFollowers } from "./paginate-building-followers.js";

export const runFollowerDelivery = async ({
  event,
  changeType,
  listingCount = 0,
  metadata,
  buildRecipientsForPage,
  logger,
  publishRealtimeHint,
  jobId,
}) => {
  const notificationEvent = {
    ...event,
    metadata,
  };

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
    const recipients = buildRecipientsForPage(followers, notificationEvent);

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

  const completionPayload = {
    event: "building_followers_notify_completed",
    changeType,
    buildingId: event.buildingId.toString(),
    listingCount,
    requested,
    sent,
    skippedDuplicate,
    skippedInvalid,
    realtimePublished,
    realtimeFailed,
    jobId,
  };

  if (requested > 0 && sent === 0) {
    logger?.warn?.(
      completionPayload,
      "Building follower notification job completed with zero deliveries",
    );
  } else {
    logger?.info?.(
      completionPayload,
      "Completed building follower notification job",
    );
  }

  return {
    ok: true,
    skipped: false,
    changeType,
    listingCount,
    requested,
    sent,
    skippedDuplicate,
    skippedInvalid,
    realtimePublished,
    realtimeFailed,
    notificationIds,
  };
};
