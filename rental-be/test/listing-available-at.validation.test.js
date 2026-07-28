import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "../shared/errors/app-error.js";
import {
  getCalendarDateKeyInTimeZone,
  startOfCalendarDayInTimeZone,
  validateNullableDateAtStartOfDay,
} from "../shared/validators/index.js";
import { validateAvailableAt } from "../modules/listing/listing.validation.js";
import { buildCreateListingRecord } from "../modules/listing/mappers/build-create-listing-record.js";
import { buildOwnerUpdateListingRecord } from "../modules/listing/mappers/build-owner-update-listing-record.js";

const actorId = "507f1f77bcf86cd799439011";
const buildingId = "507f1f77bcf86cd799439012";

const juneTenthBangkok = startOfCalendarDayInTimeZone("2026-06-10");

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

test("validateAvailableAt returns null for omitted and explicit null", () => {
  assert.equal(validateAvailableAt(undefined), null);
  assert.equal(validateAvailableAt(null), null);
});

test("validateAvailableAt normalizes date-only strings to Bangkok start of day", () => {
  assert.deepEqual(validateAvailableAt("2026-06-10"), juneTenthBangkok);
});

test("validateAvailableAt normalizes datetime strings to Bangkok calendar day", () => {
  const normalized = validateAvailableAt("2026-06-10T20:30:00.000Z");
  const dateKey = getCalendarDateKeyInTimeZone(normalized);

  assert.equal(dateKey, "2026-06-11");
  assert.deepEqual(normalized, startOfCalendarDayInTimeZone("2026-06-11"));
});

test("validateAvailableAt rejects empty and invalid values", () => {
  for (const input of ["", "   ", "not-a-date", 123, {}, []]) {
    assert.throws(
      () => validateAvailableAt(input),
      (error) => error instanceof AppError && error.statusCode === 422,
    );
  }
});

test("buildCreateListingRecord stores null when availableAt is omitted", () => {
  const record = buildCreateListingRecord(minimalCreateBody, actorId);

  assert.equal(record.availableAt, null);
});

test("buildCreateListingRecord stores null when availableAt is explicitly null", () => {
  const record = buildCreateListingRecord(
    { ...minimalCreateBody, availableAt: null },
    actorId,
  );

  assert.equal(record.availableAt, null);
});

test("buildCreateListingRecord stores normalized date when availableAt is provided", () => {
  const record = buildCreateListingRecord(
    { ...minimalCreateBody, availableAt: "2026-06-10" },
    actorId,
  );

  assert.deepEqual(record.availableAt, juneTenthBangkok);
});

test("buildOwnerUpdateListingRecord leaves availableAt unchanged when omitted", () => {
  const update = buildOwnerUpdateListingRecord({
    body: { rent: 15000 },
    listing: {
      rent: 14000,
      availableAt: juneTenthBangkok,
    },
  });

  assert.deepEqual(update, { rent: 15000 });
  assert.equal(Object.hasOwn(update, "availableAt"), false);
});

test("buildOwnerUpdateListingRecord sets flexible when availableAt is explicitly null", () => {
  const update = buildOwnerUpdateListingRecord({
    body: { availableAt: null },
    listing: {
      availableAt: juneTenthBangkok,
    },
  });

  assert.equal(update.availableAt, null);
});

test("buildOwnerUpdateListingRecord updates availableAt when a valid date is sent", () => {
  const update = buildOwnerUpdateListingRecord({
    body: { availableAt: "2026-07-01" },
    listing: {
      availableAt: juneTenthBangkok,
    },
  });

  assert.deepEqual(
    update.availableAt,
    startOfCalendarDayInTimeZone("2026-07-01"),
  );
});

test("validateNullableDateAtStartOfDay rejects unsupported time zones", () => {
  assert.throws(
    () => startOfCalendarDayInTimeZone("2026-06-10", "UTC"),
    /Unsupported time zone/,
  );
});
