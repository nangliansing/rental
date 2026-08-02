import assert from "node:assert/strict";
import test from "node:test";

import mongoose from "mongoose";

import { AppError } from "../shared/errors/app-error.js";
import { buildCreateListingRecord } from "../modules/listing/mappers/build-create-listing-record.js";
import { buildOwnerUpdateListingRecord } from "../modules/listing/mappers/build-owner-update-listing-record.js";
import { validatePrivateNote } from "../modules/listing/listing.validation.js";
import {
  isListingOwnedByViewer,
  serializeListingForApi,
} from "../modules/listing/utils/serialize-listing-for-api.js";

const actorId = "507f1f77bcf86cd799439011";
const buildingId = "507f1f77bcf86cd799439012";
const ownerId = "507f1f77bcf86cd799439013";

const minimalCreateBody = {
  buildingId,
  isForeignerAccepted: true,
  isTM30Provided: false,
  rent: 14000,
  deposit: 28000,
  moveInCost: 42000,
  bedroomCount: 1,
  bathroomCount: 1,
  contractMonths: 3,
  occupancy: 1,
  isCookingAllowed: true,
  isPetAllowed: false,
  facilities: [],
  media: [
    {
      publicId: "listing/test-photo",
      secureUrl: "https://example.com/photo.jpg",
    },
  ],
};

test("validatePrivateNote trims optional strings and blank values become null", () => {
  assert.equal(validatePrivateNote(null), null);
  assert.equal(validatePrivateNote(undefined), null);
  assert.equal(validatePrivateNote("   "), null);
  assert.equal(validatePrivateNote("  owner note  "), "owner note");
});

test("validatePrivateNote rejects non-string values", () => {
  assert.throws(
    () => validatePrivateNote(123),
    /privateNote must be a string/,
  );
});

test("validatePrivateNote rejects notes longer than 3000 characters", () => {
  assert.throws(
    () => validatePrivateNote("a".repeat(3001)),
    /privateNote must be at most 3000 characters/,
  );
});

test("buildCreateListingRecord stores null when privateNote is omitted", () => {
  const record = buildCreateListingRecord(minimalCreateBody, actorId);

  assert.equal(record.privateNote, null);
});

test("buildCreateListingRecord stores trimmed privateNote when provided", () => {
  const record = buildCreateListingRecord(
    { ...minimalCreateBody, privateNote: "  Call before viewing  " },
    actorId,
  );

  assert.equal(record.privateNote, "Call before viewing");
});

test("buildOwnerUpdateListingRecord leaves privateNote unchanged when omitted", () => {
  const update = buildOwnerUpdateListingRecord({
    body: { rent: 15000 },
    listing: {
      rent: 14000,
      privateNote: "Existing note",
    },
  });

  assert.deepEqual(update, { rent: 15000 });
  assert.equal(Object.hasOwn(update, "privateNote"), false);
});

test("buildOwnerUpdateListingRecord updates privateNote when a new value is sent", () => {
  const update = buildOwnerUpdateListingRecord({
    body: { privateNote: " Updated note " },
    listing: {
      privateNote: "Existing note",
    },
  });

  assert.equal(update.privateNote, "Updated note");
});

test("buildOwnerUpdateListingRecord clears privateNote when explicitly null", () => {
  const update = buildOwnerUpdateListingRecord({
    body: { privateNote: null },
    listing: {
      privateNote: "Existing note",
    },
  });

  assert.equal(update.privateNote, null);
});

test("buildOwnerUpdateListingRecord rejects unknown fields alongside privateNote", () => {
  assert.throws(
    () =>
      buildOwnerUpdateListingRecord({
        body: { privateNote: "Note", secretField: "nope" },
        listing: { privateNote: null },
      }),
    (error) => error instanceof AppError && error.statusCode === 422,
  );
});

test("isListingOwnedByViewer matches string and ObjectId listedBy values", () => {
  const listing = {
    rent: 14000,
    buildingId: "507f1f77bcf86cd799439012",
    listedBy: new mongoose.Types.ObjectId(ownerId),
    visibility: "PUBLIC",
  };

  assert.equal(isListingOwnedByViewer(listing, ownerId), true);
  assert.equal(isListingOwnedByViewer(listing, "507f1f77bcf86cd799439099"), false);
});

test("serializeListingForApi keeps null privateNote only when explicitly included", () => {
  const serialized = serializeListingForApi(
    {
      rent: 14000,
      buildingId: "507f1f77bcf86cd799439012",
      listedBy: ownerId,
      visibility: "PUBLIC",
      privateNote: null,
    },
    { includePrivateNote: true },
  );

  assert.equal(Object.hasOwn(serialized, "privateNote"), true);
  assert.equal(serialized.privateNote, null);
});
