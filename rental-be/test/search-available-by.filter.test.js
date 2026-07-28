import assert from "node:assert/strict";
import test from "node:test";

import { AppError } from "../shared/errors/app-error.js";
import { startOfCalendarDayInTimeZone } from "../shared/validators/index.js";
import { buildSearchListingFilters } from "../modules/search/filters/build-search-listing-filters.js";
import { buildListingFilterMatch } from "../modules/search/pipelines/helpers/build-listing-filter-match.js";

const augustFifteenthBangkok = startOfCalendarDayInTimeZone("2026-08-15");

test("buildSearchListingFilters omits availableBy when undefined or null", () => {
  assert.equal(
    Object.hasOwn(buildSearchListingFilters({}), "availableBy"),
    false,
  );
  assert.equal(
    Object.hasOwn(buildSearchListingFilters({ availableBy: null }), "availableBy"),
    false,
  );
});

test("buildSearchListingFilters normalizes availableBy to Thailand start of day", () => {
  const filters = buildSearchListingFilters({ availableBy: "2026-08-15" });

  assert.deepEqual(filters.availableBy, augustFifteenthBangkok);
});

test("buildSearchListingFilters rejects invalid availableBy", () => {
  for (const availableBy of ["", "   ", "not-a-date", 123]) {
    assert.throws(
      () => buildSearchListingFilters({ availableBy }),
      (error) =>
        error instanceof AppError &&
        error.statusCode === 422 &&
        error.message.includes("availableBy"),
    );
  }
});

test("buildListingFilterMatch omits availableAt constraint when availableBy is absent", () => {
  const match = buildListingFilterMatch({});

  assert.equal(Object.hasOwn(match, "$or"), false);
  assert.equal(Object.hasOwn(match, "availableAt"), false);
});

test("buildListingFilterMatch includes Flexible and listings available by the date", () => {
  const match = buildListingFilterMatch({
    availableBy: augustFifteenthBangkok,
  });

  assert.deepEqual(match.$or, [
    { availableAt: null },
    { availableAt: { $lte: augustFifteenthBangkok } },
  ]);
});
