import assert from "node:assert/strict";
import test from "node:test";

import { LISTING_VISIBILITIES } from "../modules/listing/listing.constants.js";
import { validateOwnerListingFilter } from "../modules/listing/listing.validation.js";
import { applyOwnerListingFilterToMatch } from "../modules/listing/utils/apply-owner-listing-filter-to-match.js";
import { buildOwnerListingFilterMatch } from "../modules/listing/utils/build-owner-listing-filter-match.js";
import { startOfCalendarDayInTimeZone } from "../shared/validators/date.validators.js";

const referenceDate = new Date("2026-07-30T12:00:00+07:00");

test("validateOwnerListingFilter normalizes filter values", () => {
  assert.equal(validateOwnerListingFilter(undefined), "all");
  assert.equal(validateOwnerListingFilter(" NOW "), "now");
  assert.equal(validateOwnerListingFilter("Soon"), "soon");
  assert.equal(validateOwnerListingFilter("private"), "private");
});

test("buildOwnerListingFilterMatch returns expected constraints", () => {
  const tomorrowStart = new Date(
    startOfCalendarDayInTimeZone("2026-07-31").getTime(),
  );

  assert.deepEqual(buildOwnerListingFilterMatch("all", referenceDate), {});

  assert.deepEqual(buildOwnerListingFilterMatch("private", referenceDate), {
    visibility: LISTING_VISIBILITIES.PRIVATE,
  });

  assert.deepEqual(buildOwnerListingFilterMatch("now", referenceDate), {
    visibility: LISTING_VISIBILITIES.PUBLIC,
    availableAt: { $ne: null, $lt: tomorrowStart },
  });

  assert.deepEqual(buildOwnerListingFilterMatch("soon", referenceDate), {
    visibility: LISTING_VISIBILITIES.PUBLIC,
    availableAt: { $gte: tomorrowStart },
  });
});

test("applyOwnerListingFilterToMatch prefers filter over legacy visibility", () => {
  const match = { listedBy: "user-1", isDeleted: false };

  applyOwnerListingFilterToMatch(
    match,
    { filter: "now", visibility: "PRIVATE" },
    referenceDate,
  );

  assert.equal(match.visibility, LISTING_VISIBILITIES.PUBLIC);
  assert.equal(match.availableAt.$ne, null);
});

test("applyOwnerListingFilterToMatch keeps legacy visibility when filter is absent", () => {
  const publicMatch = { listedBy: "user-1", isDeleted: false };
  applyOwnerListingFilterToMatch(publicMatch, { visibility: "PUBLIC" });

  assert.deepEqual(publicMatch, {
    listedBy: "user-1",
    isDeleted: false,
    visibility: LISTING_VISIBILITIES.PUBLIC,
  });

  const privateMatch = { listedBy: "user-1", isDeleted: false };
  applyOwnerListingFilterToMatch(privateMatch, { visibility: "private" });

  assert.deepEqual(privateMatch.visibility, LISTING_VISIBILITIES.PRIVATE);
});
