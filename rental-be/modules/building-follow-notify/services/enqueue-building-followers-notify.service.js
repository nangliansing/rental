import { JOB_NAMES } from "../../../shared/queue/constants.js";
import { enqueueJob } from "../../../shared/queue/enqueue.js";
import { detectBuildingPriceDrop } from "../detectors/detect-building-price-drop.js";
import { detectNewPublicListing } from "../detectors/detect-new-public-listing.js";
import { detectListingAvailableAgain } from "../detectors/detect-listing-available-again.js";
import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../building-follow-notify.constants.js";
import {
  buildBuildingFollowersNotifyJobId,
} from "../utils/build-follower-dedupe-key.js";
import { getMergeableJobData } from "../utils/get-mergeable-job-data.js";
import {
  mergeBuildingFollowersNotifyJobData,
  normalizeBuildingFollowersNotifyJobData,
} from "../utils/merge-building-followers-notify-job-data.js";
import {
  validateBuildingFollowersNotifyEvent,
  validateBuildingFollowersNotifyOptions,
} from "../validate-building-followers-notify-event.js";

const toIsoString = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
};

const buildListingEntry = (detected, occurredAt) => ({
  listingId: detected.listingId,
  rent: detected.rent ?? null,
  availableAt: detected.availableAt ?? null,
  occurredAt: toIsoString(occurredAt),
  excludeUserId: detected.excludeUserId ?? null,
  becamePublic: detected.becamePublic === true,
  availabilityChanged: detected.availabilityChanged === true,
});

const buildJobPayloadFromDetected = (detected, { buildingName, occurredAt }) => {
  const resolvedOccurredAt = occurredAt ?? new Date();

  if (detected.changeType === BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED) {
    return normalizeBuildingFollowersNotifyJobData({
      changeType: detected.changeType,
      buildingId: detected.buildingId,
      occurredAt: toIsoString(resolvedOccurredAt),
      metadata: {
        buildingName: buildingName ?? null,
        oldMinRent: detected.oldMinRent,
        newMinRent: detected.newMinRent,
      },
    });
  }

  return normalizeBuildingFollowersNotifyJobData({
    changeType: detected.changeType,
    buildingId: detected.buildingId,
    occurredAt: toIsoString(resolvedOccurredAt),
    listings: [buildListingEntry(detected, resolvedOccurredAt)],
    metadata: {
      buildingName: buildingName ?? detected.buildingName ?? null,
    },
  });
};

export const prepareBuildingFollowersNotifyJobData = async (incomingData) => {
  const incoming = normalizeBuildingFollowersNotifyJobData(incomingData);

  if (!incoming) {
    return null;
  }

  const jobId = buildBuildingFollowersNotifyJobId({
    changeType: incoming.changeType,
    buildingId: incoming.buildingId,
  });

  const existing = await getMergeableJobData(jobId);

  return mergeBuildingFollowersNotifyJobData(existing, incoming);
};

export const enqueueBuildingFollowersNotify = async (input, options = {}) => {
  const event = validateBuildingFollowersNotifyEvent(input);
  const validatedOptions = validateBuildingFollowersNotifyOptions(options);
  const incomingPayload = normalizeBuildingFollowersNotifyJobData({
    changeType: event.changeType,
    buildingId: event.buildingId.toString(),
    occurredAt: event.occurredAt.toISOString(),
    excludeUserIds: event.excludeUserIds.map((userId) => userId.toString()),
    listings: event.listings.map((listing) => ({
      listingId: listing.listingId.toString(),
      rent: listing.rent,
      availableAt: listing.availableAt,
      occurredAt: listing.occurredAt.toISOString(),
      excludeUserId: listing.excludeUserId?.toString() ?? null,
      becamePublic: listing.becamePublic,
      availabilityChanged: listing.availabilityChanged,
    })),
    metadata: event.metadata,
  });

  const mergedPayload = await prepareBuildingFollowersNotifyJobData(incomingPayload);
  const jobId = buildBuildingFollowersNotifyJobId({
    changeType: mergedPayload.changeType,
    buildingId: mergedPayload.buildingId,
  });

  const result = await enqueueJob({
    name: JOB_NAMES.BUILDING_FOLLOWERS_NOTIFY,
    data: mergedPayload,
    jobId,
    delayMs: validatedOptions.delayMs,
  });

  validatedOptions.logger?.info?.(
    {
      event: "building_followers_notify_enqueued",
      changeType: mergedPayload.changeType,
      buildingId: mergedPayload.buildingId,
      listingCount: mergedPayload.listings?.length ?? 0,
      enqueued: result.enqueued,
      updated: result.updated ?? false,
      reason: result.reason,
    },
    "Enqueued building follower notification job",
  );

  return {
    ...result,
    listingCount: mergedPayload.listings?.length ?? 0,
  };
};

export const maybeEnqueueBuildingFollowerPriceDrop = async ({
  buildingId,
  buildingName,
  oldMinRent,
  newMinRent,
  occurredAt,
  logger,
} = {}) => {
  const detected = detectBuildingPriceDrop({ oldMinRent, newMinRent });

  if (!detected) {
    return { enqueued: false, reason: "no_change" };
  }

  detected.buildingId = buildingId;

  return enqueueBuildingFollowersNotify(
    buildJobPayloadFromDetected(detected, {
      buildingName,
      occurredAt: occurredAt ?? new Date(),
    }),
    { logger },
  );
};

export const maybeEnqueueBuildingFollowerNewListing = async ({
  listing,
  buildingId,
  buildingName,
  occurredAt,
  logger,
} = {}) => {
  const detected = detectNewPublicListing({ listing, buildingId, buildingName });

  if (!detected) {
    return { enqueued: false, reason: "no_change" };
  }

  return enqueueBuildingFollowersNotify(
    buildJobPayloadFromDetected(detected, {
      buildingName,
      occurredAt: occurredAt ?? new Date(),
    }),
    { logger },
  );
};

export const maybeEnqueueBuildingFollowerAvailableAgain = async ({
  before,
  after,
  buildingName,
  occurredAt,
  referenceDate,
  logger,
} = {}) => {
  const detected = detectListingAvailableAgain({
    before,
    after,
    referenceDate,
  });

  if (!detected) {
    return { enqueued: false, reason: "no_change" };
  }

  return enqueueBuildingFollowersNotify(
    buildJobPayloadFromDetected(detected, {
      buildingName,
      occurredAt: occurredAt ?? new Date(),
    }),
    { logger },
  );
};
