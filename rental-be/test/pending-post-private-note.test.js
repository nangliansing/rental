import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "../shared/errors/app-error.js";
import { validatePendingListing } from "../modules/pending-post/pending-post.validation.js";

const minimalPendingListing = {
  visibility: "PUBLIC",
  isForeignerAccepted: true,
  isTM30Provided: false,
  rent: 14000,
  deposit: 28000,
  moveInCost: 42000,
  bedroomCount: 1,
  bathroomCount: 1,
  kitchenType: "Kitchen",
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
  description: "Test room",
  availableAt: null,
};

test("validatePendingListing stores trimmed privateNote when provided", () => {
  const listing = validatePendingListing({
    ...minimalPendingListing,
    privateNote: "  Gate code 1234  ",
  });

  assert.equal(listing.privateNote, "Gate code 1234");
});

test("validatePendingListing stores null when privateNote is omitted", () => {
  const listing = validatePendingListing(minimalPendingListing);

  assert.equal(listing.privateNote, null);
});

test("validatePendingListing stores null when privateNote is blank", () => {
  const listing = validatePendingListing({
    ...minimalPendingListing,
    privateNote: "   ",
  });

  assert.equal(listing.privateNote, null);
});

test("validatePendingListing rejects non-string privateNote values", () => {
  assert.throws(
    () =>
      validatePendingListing({
        ...minimalPendingListing,
        privateNote: 123,
      }),
    (error) =>
      error instanceof AppError &&
      /privateNote must be a string/.test(error.message),
  );
});

test("validatePendingListing rejects privateNote longer than 3000 characters", () => {
  assert.throws(
    () =>
      validatePendingListing({
        ...minimalPendingListing,
        privateNote: "a".repeat(3001),
      }),
    (error) =>
      error instanceof AppError &&
      /privateNote must be at most 3000 characters/.test(error.message),
  );
});
