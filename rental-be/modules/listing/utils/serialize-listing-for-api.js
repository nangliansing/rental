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

export const isListingOwnedByViewer = (listing, viewerUserId) => {
  if (!isListingLike(listing) || viewerUserId == null) {
    return false;
  }

  const listedBy = listing.listedBy?._id ?? listing.listedBy;

  return String(listedBy) === String(viewerUserId);
};

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

const redactPrivateNote = (listing) => {
  if (!Object.hasOwn(listing, "privateNote")) {
    return listing;
  }

  const { privateNote, ...rest } = listing;
  return rest;
};

export const serializeListingForApi = (listing, options = {}) => {
  if (!isListingLike(listing)) {
    return listing;
  }

  let serialized = {
    ...listing,
    availableAt: serializeAvailableAtForApi(
      Object.hasOwn(listing, "availableAt") ? listing.availableAt : null,
    ),
  };

  if (!options.includePrivateNote) {
    serialized = redactPrivateNote(serialized);
  }

  return serialized;
};

export const serializeListingDocumentForApi = (listing, options = {}) => {
  if (listing == null) {
    return listing;
  }

  const plain = listing.toObject
    ? listing.toObject({ depopulate: true })
    : listing;

  return serializeListingForApi(plain, options);
};

export const serializeListingPayloadForApi = (payload, options = {}) => {
  if (payload == null) {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => serializeListingPayloadForApi(item, options));
  }

  if (isListingLike(payload)) {
    return serializeListingForApi(payload, options);
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

    const serialized = serializeListingPayloadForApi(payload[key], options);

    if (serialized !== payload[key]) {
      result[key] = serialized;
      changed = true;
    }
  }

  return changed ? result : payload;
};
