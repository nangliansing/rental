import assert from "node:assert/strict";
import test from "node:test";

import { validateListingAvailabilityFilter } from "../modules/listing/listing.validation.js";
import { buildListingAvailabilityFilterMatch } from "../modules/listing/utils/build-listing-availability-filter-match.js";
import { startOfCalendarDayInTimeZone } from "../shared/validators/date.validators.js";

const referenceDate = new Date("2026-07-30T12:00:00+07:00");

test("validateListingAvailabilityFilter normalizes filter values", () => {
  assert.equal(validateListingAvailabilityFilter(undefined), "all");
  assert.equal(validateListingAvailabilityFilter(" NOW "), "now");
  assert.equal(validateListingAvailabilityFilter("Soon"), "soon");
});

test("buildListingAvailabilityFilterMatch returns expected constraints", () => {
  const tomorrowStart = new Date(
    startOfCalendarDayInTimeZone("2026-07-31").getTime(),
  );

  assert.deepEqual(
    buildListingAvailabilityFilterMatch("all", referenceDate),
    {},
  );

  assert.deepEqual(buildListingAvailabilityFilterMatch("now", referenceDate), {
    availableAt: { $ne: null, $lt: tomorrowStart },
  });

  assert.deepEqual(buildListingAvailabilityFilterMatch("soon", referenceDate), {
    availableAt: { $gte: tomorrowStart },
  });
});
