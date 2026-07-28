const LISTING_CONTAINER_KEYS = Object.freeze([
  "listing",
  "listings",
  "data",
  "savedListings",
]);

export const isListingLike = (value) =>
  Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.hasOwn(value, "rent") &&
      Object.hasOwn(value, "buildingId") &&
      (Object.hasOwn(value, "listedBy") || Object.hasOwn(value, "visibility")),
  );

export const serializeAvailableAtForApi = (value) => {
  if (value == null) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
};

export const serializeListingForApi = (listing) => {
  if (!isListingLike(listing)) {
    return listing;
  }

  return {
    ...listing,
    availableAt: serializeAvailableAtForApi(
      Object.hasOwn(listing, "availableAt") ? listing.availableAt : null,
    ),
  };
};

export const serializeListingDocumentForApi = (listing) => {
  if (listing == null) {
    return listing;
  }

  const plain = listing.toObject
    ? listing.toObject({ depopulate: true })
    : listing;

  return serializeListingForApi(plain);
};

export const serializeListingPayloadForApi = (payload) => {
  if (payload == null) {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map(serializeListingPayloadForApi);
  }

  if (isListingLike(payload)) {
    return serializeListingForApi(payload);
  }

  if (typeof payload !== "object") {
    return payload;
  }

  let changed = false;
  const result = { ...payload };

  for (const key of LISTING_CONTAINER_KEYS) {
    if (!Object.hasOwn(payload, key)) {
      continue;
    }

    const serialized = serializeListingPayloadForApi(payload[key]);

    if (serialized !== payload[key]) {
      result[key] = serialized;
      changed = true;
    }
  }

  return changed ? result : payload;
};
