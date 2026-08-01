import { buildFollowerDedupeKey } from "./build-follower-dedupe-key.js";
import { buildFollowerNotificationContent } from "./build-follower-notification-content.js";
import {
  filterEligibleListingsForFollower,
  shouldExcludeFollower,
} from "./merge-building-followers-notify-job-data.js";

export const buildPriceDropRecipients = ({ followers, event }) => {
  const recipients = [];
  const excludeUserIds = event.excludeUserIds.map((id) => id.toString());

  for (const follower of followers) {
    const userId = follower.userId?.toString();

    if (!userId || shouldExcludeFollower(userId, { excludeUserIds })) {
      continue;
    }

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
  }

  return recipients;
};

export const buildListingBatchRecipients = ({
  followers,
  event,
  eligibleListings,
}) => {
  const recipients = [];
  const excludeUserIds = event.excludeUserIds.map((id) => id.toString());

  for (const follower of followers) {
    const userId = follower.userId?.toString();

    if (!userId || shouldExcludeFollower(userId, { excludeUserIds })) {
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
