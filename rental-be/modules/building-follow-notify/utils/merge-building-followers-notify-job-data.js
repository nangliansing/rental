import {
  BUILDING_FOLLOWER_CHANGE_TYPES,
  BUILDING_FOLLOWERS_MAX_LISTINGS_PER_JOB,
} from "../building-follow-notify.constants.js";

const toIdString = (value) => {
  if (value == null) return null;
  return typeof value === "string" ? value : value.toString();
};

const toIsoString = (value) => {
  if (value == null) return null;

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};

const listingEntryKey = (entry) => toIdString(entry?.listingId);

const normalizeListingEntry = (entry, fallbackOccurredAt) => ({
  listingId: toIdString(entry.listingId),
  rent: entry.rent ?? null,
  availableAt: entry.availableAt ?? null,
  occurredAt: toIsoString(entry.occurredAt) ?? fallbackOccurredAt,
  excludeUserId: toIdString(entry.excludeUserId),
  becamePublic: entry.becamePublic === true,
  availabilityChanged: entry.availabilityChanged === true,
});

const normalizeListingsArray = (listings, fallbackOccurredAt) => {
  if (!Array.isArray(listings)) {
    return [];
  }

  const normalized = [];

  for (const entry of listings) {
    const listingId = listingEntryKey(entry);

    if (!listingId) {
      continue;
    }

    normalized.push(normalizeListingEntry(entry, fallbackOccurredAt));
  }

  return normalized;
};

const buildListingEntryFromLegacyJob = (data) => {
  const listingId = toIdString(data.listingId);

  if (!listingId) {
    return null;
  }

  return normalizeListingEntry(
    {
      listingId,
      rent: data.metadata?.rent ?? null,
      availableAt: data.metadata?.availableAt ?? null,
      occurredAt: data.occurredAt,
      excludeUserId: data.excludeUserId,
      becamePublic: data.metadata?.becamePublic,
      availabilityChanged: data.metadata?.availabilityChanged,
    },
    toIsoString(data.occurredAt),
  );
};

export const normalizeBuildingFollowersNotifyJobData = (data) => {
  if (!data || typeof data !== "object") {
    return null;
  }

  const occurredAt = toIsoString(data.occurredAt) ?? new Date().toISOString();
  const excludeUserIds = new Set();

  if (data.excludeUserId) {
    excludeUserIds.add(toIdString(data.excludeUserId));
  }

  if (Array.isArray(data.excludeUserIds)) {
    for (const userId of data.excludeUserIds) {
      const normalized = toIdString(userId);
      if (normalized) excludeUserIds.add(normalized);
    }
  }

  let listings = normalizeListingsArray(data.listings, occurredAt);

  if (listings.length === 0) {
    const legacyListing = buildListingEntryFromLegacyJob(data);

    if (legacyListing) {
      listings = [legacyListing];

      if (legacyListing.excludeUserId) {
        excludeUserIds.add(legacyListing.excludeUserId);
      }
    }
  } else {
    for (const listing of listings) {
      if (listing.excludeUserId) {
        excludeUserIds.add(listing.excludeUserId);
      }
    }
  }

  return {
    changeType: data.changeType,
    buildingId: toIdString(data.buildingId),
    occurredAt,
    excludeUserIds: [...excludeUserIds],
    listings,
    metadata: {
      buildingName: data.metadata?.buildingName ?? null,
      oldMinRent: data.metadata?.oldMinRent ?? null,
      newMinRent: data.metadata?.newMinRent ?? null,
    },
  };
};

const mergeListingEntries = (existingListings, incomingListings) => {
  const byListingId = new Map();

  for (const entry of [...existingListings, ...incomingListings]) {
    const listingId = listingEntryKey(entry);

    if (!listingId) {
      continue;
    }

    const current = byListingId.get(listingId);

    if (!current) {
      byListingId.set(listingId, entry);
      continue;
    }

    byListingId.set(listingId, {
      ...current,
      ...entry,
      occurredAt:
        current.occurredAt > entry.occurredAt ? current.occurredAt : entry.occurredAt,
    });
  }

  return [...byListingId.values()].slice(0, BUILDING_FOLLOWERS_MAX_LISTINGS_PER_JOB);
};

const mergeExcludeUserIds = (existingIds, incomingIds, listings) => {
  const merged = new Set([...(existingIds ?? []), ...(incomingIds ?? [])]);

  for (const listing of listings) {
    if (listing.excludeUserId) {
      merged.add(listing.excludeUserId);
    }
  }

  return [...merged];
};

const maxIsoTimestamp = (left, right) => {
  if (!left) return right;
  if (!right) return left;
  return left > right ? left : right;
};

const maxListingOccurredAt = (listings) => {
  let max = null;

  for (const listing of listings) {
    max = maxIsoTimestamp(max, listing.occurredAt);
  }

  return max;
};

export const mergeBuildingFollowersNotifyJobData = (existingData, incomingData) => {
  const existing = normalizeBuildingFollowersNotifyJobData(existingData);
  const incoming = normalizeBuildingFollowersNotifyJobData(incomingData);

  if (!incoming) {
    return existing;
  }

  if (!existing) {
    return incoming;
  }

  if (
    existing.changeType !== incoming.changeType ||
    existing.buildingId !== incoming.buildingId
  ) {
    return incoming;
  }

  switch (incoming.changeType) {
    case BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING:
    case BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN: {
      const listings = mergeListingEntries(existing.listings, incoming.listings);

      return {
        changeType: incoming.changeType,
        buildingId: incoming.buildingId,
        occurredAt: maxIsoTimestamp(
          maxIsoTimestamp(existing.occurredAt, incoming.occurredAt),
          maxListingOccurredAt(listings),
        ),
        excludeUserIds: mergeExcludeUserIds(
          existing.excludeUserIds,
          incoming.excludeUserIds,
          listings,
        ),
        listings,
        metadata: {
          buildingName: incoming.metadata.buildingName ?? existing.metadata.buildingName,
        },
      };
    }

    case BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED: {
      const oldMinRent = existing.metadata.oldMinRent ?? incoming.metadata.oldMinRent;
      const existingNewRent = existing.metadata.newMinRent;
      const incomingNewRent = incoming.metadata.newMinRent;
      const newMinRent =
        existingNewRent == null
          ? incomingNewRent
          : incomingNewRent == null
            ? existingNewRent
            : Math.min(existingNewRent, incomingNewRent);

      return {
        changeType: incoming.changeType,
        buildingId: incoming.buildingId,
        occurredAt: maxIsoTimestamp(existing.occurredAt, incoming.occurredAt),
        excludeUserIds: mergeExcludeUserIds(existing.excludeUserIds, incoming.excludeUserIds, []),
        listings: [],
        metadata: {
          buildingName: incoming.metadata.buildingName ?? existing.metadata.buildingName,
          oldMinRent,
          newMinRent,
        },
      };
    }

    default:
      return incoming;
  }
};

export const filterEligibleListingsForFollower = (follower, listings) => {
  if (!follower?.createdAt || !Array.isArray(listings)) {
    return [];
  }

  const followedAt = follower.createdAt instanceof Date
    ? follower.createdAt
    : new Date(follower.createdAt);

  return listings.filter((listing) => {
    const listingOccurredAt = listing.occurredAt
      ? new Date(listing.occurredAt)
      : null;

    if (!listingOccurredAt || Number.isNaN(listingOccurredAt.getTime())) {
      return false;
    }

    return followedAt <= listingOccurredAt;
  });
};

export const shouldExcludeFollower = (followerUserId, { excludeUserIds } = {}) => {
  const userId = toIdString(followerUserId);

  if (!userId) {
    return true;
  }

  return excludeUserIds?.includes(userId) ?? false;
};
