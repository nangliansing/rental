export const QUEUE_NAMES = Object.freeze({
  DEFAULT: "default",
});

export const JOB_NAMES = Object.freeze({
  SYSTEM_PING: "system.ping",
  /** @deprecated In-flight jobs only; new work uses type-specific names below. */
  BUILDING_FOLLOWERS_NOTIFY: "building.followers.notify",
  BUILDING_FOLLOWERS_PRICE_DROP: "building.followers.price.drop",
  BUILDING_FOLLOWERS_NEW_LISTING: "building.followers.new.listing",
  BUILDING_FOLLOWERS_AVAILABLE_AGAIN: "building.followers.available.again",
});

export const REALTIME_PUBSUB_CHANNEL = "rental:queue:realtime";

export const JOB_NAME_PATTERN = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/;
export const JOB_ID_PATTERN = /^[A-Za-z0-9._-]+$/;

export const MAX_JOB_ID_LENGTH = 128;
export const MAX_JOB_DELAY_MS = 24 * 60 * 60 * 1000;
export const MAX_JOB_PRIORITY = 100;
export const MIN_JOB_PRIORITY = 1;
