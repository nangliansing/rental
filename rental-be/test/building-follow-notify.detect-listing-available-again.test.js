import assert from "node:assert/strict";
import { describe, test } from "node:test";

import mongoose from "mongoose";

import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../modules/building-follow-notify/building-follow-notify.constants.js";
import { detectListingAvailableAgain } from "../modules/building-follow-notify/detectors/detect-listing-available-again.js";
import { LISTING_VISIBILITIES } from "../modules/listing/listing.constants.js";
import { startOfCalendarDayInTimeZone } from "../shared/validators/index.js";

const REFERENCE_DATE = startOfCalendarDayInTimeZone("2026-08-15");
const FUTURE_AVAILABLE_AT = startOfCalendarDayInTimeZone("2026-09-01");

const createAfterListing = (overrides = {}) => {
  const buildingId = overrides.buildingId ?? new mongoose.Types.ObjectId();
  const listingId = overrides._id ?? overrides.id ?? new mongoose.Types.ObjectId();
  const listedBy = overrides.listedBy ?? new mongoose.Types.ObjectId();

  return {
    _id: listingId,
    buildingId,
    listedBy,
    visibility: LISTING_VISIBILITIES.PUBLIC,
    isDeleted: false,
    rent: 5500,
    availableAt: null,
    ...overrides,
  };
};

const expectNull = (input, label) => {
  assert.equal(
    detectListingAvailableAgain(input),
    null,
    `expected null for ${label}`,
  );
};

const expectDetection = (input, expected, label) => {
  const result = detectListingAvailableAgain(input);

  assert.ok(result, `expected detection for ${label}`);
  assert.equal(result.changeType, BUILDING_FOLLOWER_CHANGE_TYPES.AVAILABLE_AGAIN);
  assert.equal(
    Object.keys(result).sort().join(","),
    [
      "availableAt",
      "availabilityChanged",
      "becamePublic",
      "buildingId",
      "changeType",
      "excludeUserId",
      "listingId",
      "rent",
    ].sort().join(","),
    "result must only expose expected fields",
  );

  if (expected.buildingId != null) {
    assert.equal(result.buildingId.toString(), expected.buildingId.toString());
  }

  if (expected.listingId != null) {
    assert.equal(result.listingId.toString(), expected.listingId.toString());
  }

  assert.equal(result.becamePublic, expected.becamePublic);
  assert.equal(result.availabilityChanged, expected.availabilityChanged);

  if ("rent" in expected) {
    assert.equal(result.rent, expected.rent);
  }

  if ("availableAt" in expected) {
    assert.equal(result.availableAt, expected.availableAt);
  }

  if ("excludeUserId" in expected) {
    if (expected.excludeUserId == null) {
      assert.equal(result.excludeUserId, null);
    } else {
      assert.equal(
        result.excludeUserId.toString(),
        expected.excludeUserId.toString(),
      );
    }
  }
};

describe("detectListingAvailableAgain", () => {
  describe("returns null for missing or ineligible states", () => {
    test("rejects calls with no before/after snapshot", () => {
      expectNull(undefined, "no arguments");
      expectNull({}, "empty object");
      expectNull({ before: null, after: createAfterListing() }, "null before");
      expectNull(
        { before: { visibility: LISTING_VISIBILITIES.PUBLIC }, after: null },
        "null after",
      );
      expectNull(
        { after: createAfterListing() },
        "missing before",
      );
      expectNull(
        { before: { visibility: LISTING_VISIBILITIES.PUBLIC } },
        "missing after",
      );
    });

    test("rejects when the after snapshot is not notify-eligible", () => {
      expectNull(
        {
          before: { visibility: LISTING_VISIBILITIES.PRIVATE, availableAt: null },
          after: createAfterListing({
            visibility: LISTING_VISIBILITIES.PRIVATE,
          }),
        },
        "after still private",
      );

      expectNull(
        {
          before: { visibility: LISTING_VISIBILITIES.PUBLIC, availableAt: null },
          after: createAfterListing({ isDeleted: true }),
        },
        "after deleted",
      );
    });

    test("rejects when neither visibility nor availability meaningfully changed", () => {
      expectNull(
        {
          before: {
            visibility: LISTING_VISIBILITIES.PUBLIC,
            availableAt: null,
          },
          after: createAfterListing({ availableAt: null }),
          referenceDate: REFERENCE_DATE,
        },
        "public listing stayed public and available",
      );

      expectNull(
        {
          before: {
            visibility: LISTING_VISIBILITIES.PUBLIC,
            availableAt: FUTURE_AVAILABLE_AT,
          },
          after: createAfterListing({ availableAt: FUTURE_AVAILABLE_AT }),
          referenceDate: REFERENCE_DATE,
        },
        "still unavailable on a future date",
      );

      expectNull(
        {
          before: {
            visibility: LISTING_VISIBILITIES.PRIVATE,
            availableAt: null,
          },
          after: createAfterListing({
            visibility: LISTING_VISIBILITIES.PRIVATE,
          }),
        },
        "private to private",
      );
    });

    test("rejects when the after snapshot has no listing id", () => {
      expectNull(
        {
          before: {
            visibility: LISTING_VISIBILITIES.PRIVATE,
            availableAt: null,
          },
          after: {
            buildingId: new mongoose.Types.ObjectId(),
            visibility: LISTING_VISIBILITIES.PUBLIC,
            isDeleted: false,
            rent: 5000,
          },
        },
        "missing listing id",
      );
    });
  });

  describe("detects private-to-public transitions", () => {
    test("detects when a listing became public", () => {
      const listingId = new mongoose.Types.ObjectId();
      const buildingId = new mongoose.Types.ObjectId();
      const listedBy = new mongoose.Types.ObjectId();

      expectDetection(
        {
          before: {
            visibility: LISTING_VISIBILITIES.PRIVATE,
            availableAt: null,
          },
          after: createAfterListing({
            _id: listingId,
            buildingId,
            listedBy,
            rent: 4800,
          }),
        },
        {
          buildingId,
          listingId,
          becamePublic: true,
          availabilityChanged: false,
          rent: 4800,
          availableAt: null,
          excludeUserId: listedBy,
        },
        "private to public",
      );
    });

    test("detects private-to-public even when availability also changed", () => {
      const result = detectListingAvailableAgain({
        before: {
          visibility: LISTING_VISIBILITIES.PRIVATE,
          availableAt: FUTURE_AVAILABLE_AT,
        },
        after: createAfterListing({
          availableAt: REFERENCE_DATE,
        }),
        referenceDate: REFERENCE_DATE,
      });

      assert.equal(result.becamePublic, true);
      assert.equal(result.availabilityChanged, true);
    });
  });

  describe("detects availability transitions to now", () => {
    test("detects when a future availableAt moved to today", () => {
      const listingId = new mongoose.Types.ObjectId();
      const buildingId = new mongoose.Types.ObjectId();

      expectDetection(
        {
          before: {
            visibility: LISTING_VISIBILITIES.PUBLIC,
            availableAt: FUTURE_AVAILABLE_AT,
          },
          after: createAfterListing({
            _id: listingId,
            buildingId,
            availableAt: REFERENCE_DATE,
            rent: 4800,
          }),
          referenceDate: REFERENCE_DATE,
        },
        {
          buildingId,
          listingId,
          becamePublic: false,
          availabilityChanged: true,
          rent: 4800,
          availableAt: REFERENCE_DATE,
        },
        "future to today",
      );
    });

    test("detects when a future availableAt was cleared to immediate availability", () => {
      const result = detectListingAvailableAgain({
        before: {
          visibility: LISTING_VISIBILITIES.PUBLIC,
          availableAt: FUTURE_AVAILABLE_AT,
        },
        after: createAfterListing({ availableAt: null }),
        referenceDate: REFERENCE_DATE,
      });

      assert.equal(result.becamePublic, false);
      assert.equal(result.availabilityChanged, true);
      assert.equal(result.availableAt, null);
    });

    test("respects the provided referenceDate when evaluating availability", () => {
      const earlierReference = startOfCalendarDayInTimeZone("2026-08-01");

      expectNull(
        {
          before: {
            visibility: LISTING_VISIBILITIES.PUBLIC,
            availableAt: FUTURE_AVAILABLE_AT,
          },
          after: createAfterListing({
            availableAt: startOfCalendarDayInTimeZone("2026-08-20"),
          }),
          referenceDate: earlierReference,
        },
        "still future relative to earlier reference date",
      );
    });
  });

  describe("normalizes listing metadata safely", () => {
    test("accepts listing.id when _id is not present", () => {
      const listingId = new mongoose.Types.ObjectId();
      const buildingId = new mongoose.Types.ObjectId();

      const result = detectListingAvailableAgain({
        before: {
          visibility: LISTING_VISIBILITIES.PRIVATE,
          availableAt: null,
        },
        after: {
          id: listingId,
          buildingId,
          visibility: LISTING_VISIBILITIES.PUBLIC,
          isDeleted: false,
          rent: 5000,
          availableAt: null,
        },
      });

      assert.equal(result.listingId.toString(), listingId.toString());
    });

    test("returns null rent for non-numeric values", () => {
      const result = detectListingAvailableAgain({
        before: {
          visibility: LISTING_VISIBILITIES.PRIVATE,
          availableAt: null,
        },
        after: createAfterListing({ rent: "5000" }),
      });

      assert.equal(result.rent, null);
    });

    test("sets excludeUserId to null when listedBy is missing", () => {
      const result = detectListingAvailableAgain({
        before: {
          visibility: LISTING_VISIBILITIES.PRIVATE,
          availableAt: null,
        },
        after: {
          _id: new mongoose.Types.ObjectId(),
          buildingId: new mongoose.Types.ObjectId(),
          visibility: LISTING_VISIBILITIES.PUBLIC,
          isDeleted: false,
          rent: 5000,
        },
      });

      assert.equal(result.excludeUserId, null);
    });
  });

  describe("is pure and safe for production callers", () => {
    test("does not mutate before or after snapshots", () => {
      const before = {
        visibility: LISTING_VISIBILITIES.PRIVATE,
        availableAt: null,
      };
      const after = createAfterListing({ rent: 5200 });
      const beforeSnapshot = structuredClone({
        ...before,
      });
      const afterSnapshot = structuredClone({
        ...after,
        _id: after._id.toString(),
        buildingId: after.buildingId.toString(),
        listedBy: after.listedBy.toString(),
      });

      detectListingAvailableAgain({ before, after, referenceDate: REFERENCE_DATE });

      assert.deepEqual(before, beforeSnapshot);
      assert.equal(after.rent, 5200);
      assert.equal(after.visibility, LISTING_VISIBILITIES.PUBLIC);
    });

    test("returns a fresh object on every successful detection", () => {
      const input = {
        before: {
          visibility: LISTING_VISIBILITIES.PRIVATE,
          availableAt: null,
        },
        after: createAfterListing(),
      };

      const first = detectListingAvailableAgain(input);
      const second = detectListingAvailableAgain(input);

      assert.notEqual(first, second);
      assert.deepEqual(
        {
          ...first,
          buildingId: first.buildingId.toString(),
          listingId: first.listingId.toString(),
          excludeUserId: first.excludeUserId.toString(),
        },
        {
          ...second,
          buildingId: second.buildingId.toString(),
          listingId: second.listingId.toString(),
          excludeUserId: second.excludeUserId.toString(),
        },
      );
    });

    test("never throws for malformed caller input", () => {
      const cases = [
        undefined,
        {},
        { before: null, after: null },
        {
          before: { visibility: LISTING_VISIBILITIES.PUBLIC },
          after: { visibility: LISTING_VISIBILITIES.PUBLIC, isDeleted: false },
        },
      ];

      for (const input of cases) {
        assert.doesNotThrow(() => detectListingAvailableAgain(input));
      }
    });
  });
});
