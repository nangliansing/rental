import assert from "node:assert/strict";
import test from "node:test";

import {
  LISTING_DETAILS_MONGO_PROJECT,
  LISTING_DETAILS_OWNER_ONLY_FIELDS,
} from "../modules/listing/constants/listing-details.projection.js";
import { listingDetailsSchemaDefinition } from "../modules/listing/schemas/index.js";
import {
  isListingLike,
  isListingOwnedByViewer,
  serializeAvailableAtForApi,
  serializeListingForApi,
  serializeListingPayloadForApi,
} from "../modules/listing/utils/serialize-listing-for-api.js";

const sampleListing = {
  _id: "507f1f77bcf86cd799439011",
  rent: 14000,
  buildingId: "507f1f77bcf86cd799439012",
  listedBy: "507f1f77bcf86cd799439013",
  visibility: "PUBLIC",
};

test("LISTING_DETAILS_MONGO_PROJECT stays in sync with public listing details fields", () => {
  for (const field of Object.keys(listingDetailsSchemaDefinition)) {
    if (LISTING_DETAILS_OWNER_ONLY_FIELDS.includes(field)) {
      assert.equal(LISTING_DETAILS_MONGO_PROJECT[field], undefined);
      continue;
    }

    assert.equal(LISTING_DETAILS_MONGO_PROJECT[field], 1);
  }

  assert.equal(LISTING_DETAILS_MONGO_PROJECT.availableAt, 1);
  assert.equal(LISTING_DETAILS_MONGO_PROJECT.privateNote, undefined);
});

test("serializeAvailableAtForApi returns null for missing and invalid values", () => {
  assert.equal(serializeAvailableAtForApi(null), null);
  assert.equal(serializeAvailableAtForApi(undefined), null);
  assert.equal(serializeAvailableAtForApi("not-a-date"), null);
});

test("serializeAvailableAtForApi returns ISO strings for valid dates", () => {
  const iso = serializeAvailableAtForApi("2026-06-10T00:00:00+07:00");

  assert.equal(typeof iso, "string");
  assert.equal(iso, "2026-06-09T17:00:00.000Z");
});

test("serializeListingForApi always includes availableAt", () => {
  assert.deepEqual(serializeListingForApi(sampleListing), {
    ...sampleListing,
    availableAt: null,
  });

  assert.deepEqual(
    serializeListingForApi({
      ...sampleListing,
      availableAt: "2026-06-10T00:00:00+07:00",
    }).availableAt,
    "2026-06-09T17:00:00.000Z",
  );
});

test("serializeListingForApi redacts privateNote by default", () => {
  const serialized = serializeListingForApi({
    ...sampleListing,
    privateNote: "Owner only note",
  });

  assert.equal(Object.hasOwn(serialized, "privateNote"), false);
});

test("serializeListingForApi keeps privateNote only when explicitly included", () => {
  const serialized = serializeListingForApi(
    {
      ...sampleListing,
      privateNote: "Owner only note",
    },
    { includePrivateNote: true },
  );

  assert.equal(serialized.privateNote, "Owner only note");
});

test("isListingOwnedByViewer matches listedBy ids defensively", () => {
  assert.equal(
    isListingOwnedByViewer(sampleListing, "507f1f77bcf86cd799439013"),
    true,
  );
  assert.equal(
    isListingOwnedByViewer(sampleListing, "507f1f77bcf86cd799439099"),
    false,
  );
  assert.equal(isListingOwnedByViewer(sampleListing, null), false);
});

test("serializeListingPayloadForApi serializes nested listing containers", () => {
  const payload = {
    building: { _id: "building-1", name: "Test" },
    listings: [{ ...sampleListing, privateNote: "Hidden" }],
    savedListings: [{ listing: { ...sampleListing, privateNote: "Hidden" } }],
  };

  const serialized = serializeListingPayloadForApi(payload);

  assert.equal(isListingLike(serialized.listings[0]), true);
  assert.equal(serialized.listings[0].availableAt, null);
  assert.equal(Object.hasOwn(serialized.listings[0], "privateNote"), false);
  assert.equal(
    Object.hasOwn(serialized.savedListings[0].listing, "privateNote"),
    false,
  );
});

test("serializeListingPayloadForApi leaves unrelated payloads unchanged", () => {
  const payload = { name: "Test", count: 2 };

  assert.equal(serializeListingPayloadForApi(payload), payload);
});
