import { AppError } from "../../shared/errors/app-error.js";
import {
  validateEnumValue,
  validateMongooseId,
  validateNullableObject,
  validateObject,
} from "../../shared/validators/index.js";
import {
  BUILDING_FOLLOWER_CHANGE_TYPES,
  BUILDING_FOLLOWERS_MAX_LISTINGS_PER_JOB,
  BUILDING_FOLLOWERS_NOTIFY_DEBOUNCE_MS,
} from "./building-follow-notify.constants.js";
import { normalizeBuildingFollowersNotifyJobData } from "./utils/merge-building-followers-notify-job-data.js";

const validateOccurredAt = (input) => {
  if (input == null) {
    return new Date();
  }

  const date = input instanceof Date ? input : new Date(input);

  if (Number.isNaN(date.getTime())) {
    throw new AppError("occurredAt must be a valid date", 422, "VALIDATION_ERROR");
  }

  return date;
};

const validateOptionalRent = (input, fieldName) => {
  if (input == null) {
    return null;
  }

  const rent = Number(input);

  if (!Number.isFinite(rent) || rent < 0) {
    throw new AppError(`${fieldName} must be a non-negative number`, 422, "VALIDATION_ERROR");
  }

  return rent;
};

const validateRequiredRent = (input, fieldName) => {
  const rent = validateOptionalRent(input, fieldName);

  if (rent == null) {
    throw new AppError(`${fieldName} is required`, 422, "VALIDATION_ERROR");
  }

  return rent;
};

const validateListingEntry = (entry, changeType, index) => {
  validateObject(entry, `listings[${index}]`);

  const listingId = validateMongooseId(entry.listingId, `listings[${index}].listingId`, {
    asObjectId: true,
  });

  const normalized = {
    listingId,
    rent: validateOptionalRent(entry.rent, `listings[${index}].rent`),
    availableAt:
      entry.availableAt == null
        ? null
        : validateOccurredAt(entry.availableAt),
    occurredAt: validateOccurredAt(entry.occurredAt),
    excludeUserId:
      entry.excludeUserId == null
        ? null
        : validateMongooseId(entry.excludeUserId, `listings[${index}].excludeUserId`, {
            asObjectId: true,
          }),
  };

  if (changeType === BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN) {
    normalized.becamePublic = entry.becamePublic === true;
    normalized.availabilityChanged = entry.availabilityChanged === true;
  }

  return normalized;
};

const validateListingsForChangeType = (changeType, listingsInput) => {
  const listings = Array.isArray(listingsInput) ? listingsInput : [];

  if (listings.length === 0) {
    throw new AppError("listings must contain at least one entry", 422, "VALIDATION_ERROR");
  }

  if (listings.length > BUILDING_FOLLOWERS_MAX_LISTINGS_PER_JOB) {
    throw new AppError(
      `listings must contain at most ${BUILDING_FOLLOWERS_MAX_LISTINGS_PER_JOB} entries`,
      422,
      "VALIDATION_ERROR",
    );
  }

  return listings.map((entry, index) => validateListingEntry(entry, changeType, index));
};

const validatePriceDropMetadata = (metadata) => {
  validateObject(metadata, "metadata");

  const buildingName =
    metadata.buildingName == null
      ? null
      : String(metadata.buildingName).trim() || null;

  return {
    buildingName,
    oldMinRent: validateRequiredRent(metadata.oldMinRent, "metadata.oldMinRent"),
    newMinRent: validateRequiredRent(metadata.newMinRent, "metadata.newMinRent"),
  };
};

export const validateBuildingFollowersNotifyEvent = (input) => {
  validateObject(input, "event");

  const normalizedInput = normalizeBuildingFollowersNotifyJobData(input);

  if (!normalizedInput) {
    throw new AppError("event is required", 422, "VALIDATION_ERROR");
  }

  const changeType = validateEnumValue(
    normalizedInput.changeType,
    "changeType",
    Object.values(BUILDING_FOLLOWER_CHANGE_TYPES),
  );

  const buildingId = validateMongooseId(normalizedInput.buildingId, "buildingId", {
    asObjectId: true,
  });

  const occurredAt = validateOccurredAt(normalizedInput.occurredAt);

  const event = {
    changeType,
    buildingId,
    occurredAt,
    excludeUserIds: (normalizedInput.excludeUserIds ?? []).map((userId) =>
      validateMongooseId(userId, "excludeUserIds", { asObjectId: true }),
    ),
    listings: [],
    metadata: {},
  };

  if (changeType === BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED) {
    event.metadata = validatePriceDropMetadata(normalizedInput.metadata ?? {});
    return event;
  }

  event.listings = validateListingsForChangeType(
    changeType,
    normalizedInput.listings,
  );
  event.metadata = {
    buildingName:
      normalizedInput.metadata?.buildingName == null
        ? null
        : String(normalizedInput.metadata.buildingName).trim() || null,
  };

  return event;
};

export const validateBuildingFollowersNotifyOptions = (input = {}) => {
  validateNullableObject(input, "options");

  const delayMs =
    input.delayMs == null
      ? BUILDING_FOLLOWERS_NOTIFY_DEBOUNCE_MS
      : Number(input.delayMs);

  if (!Number.isInteger(delayMs) || delayMs < 0) {
    throw new AppError("delayMs must be a non-negative integer", 422, "VALIDATION_ERROR");
  }

  return {
    delayMs,
    logger: input.logger ?? null,
  };
};
