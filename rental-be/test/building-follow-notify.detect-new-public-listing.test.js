import assert from "node:assert/strict";
import { describe, test } from "node:test";

import mongoose from "mongoose";

import { BUILDING_FOLLOWER_CHANGE_TYPES } from "../modules/building-follow-notify/building-follow-notify.constants.js";
import { detectNewPublicListing } from "../modules/building-follow-notify/detectors/detect-new-public-listing.js";
import { LISTING_VISIBILITIES } from "../modules/listing/listing.constants.js";

const createPublicListing = (overrides = {}) => {
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
    detectNewPublicListing(input),
    null,
    `expected null for ${label}`,
  );
};

const expectDetection = (input, expected, label) => {
  const result = detectNewPublicListing(input);

  assert.ok(result, `expected detection for ${label}`);
  assert.equal(result.changeType, BUILDING_FOLLOWER_CHANGE_TYPES.NEW_LISTING);
  assert.equal(
    Object.keys(result).sort().join(","),
    [
      "availableAt",
      "buildingId",
      "buildingName",
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

  if ("buildingName" in expected) {
    assert.equal(result.buildingName, expected.buildingName);
  }

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

describe("detectNewPublicListing", () => {
  describe("returns null for missing or ineligible listings", () => {
    test("rejects calls with no listing", () => {
      expectNull(undefined, "no arguments");
      expectNull({}, "empty object");
      expectNull({ listing: null }, "null listing");
      expectNull({ buildingName: "Tower" }, "missing listing");
    });

    test("rejects private listings", () => {
      const buildingId = new mongoose.Types.ObjectId();

      expectNull(
        {
          listing: createPublicListing({
            buildingId,
            visibility: LISTING_VISIBILITIES.PRIVATE,
          }),
        },
        "private listing",
      );
    });

    test("rejects deleted listings", () => {
      expectNull(
        {
          listing: createPublicListing({ isDeleted: true }),
        },
        "deleted listing",
      );
    });

    test("rejects listings without a building id", () => {
      expectNull(
        {
          listing: {
            _id: new mongoose.Types.ObjectId(),
            visibility: LISTING_VISIBILITIES.PUBLIC,
            isDeleted: false,
            rent: 5000,
          },
        },
        "missing buildingId on listing and param",
      );
    });

    test("rejects listings without a listing id", () => {
      const buildingId = new mongoose.Types.ObjectId();

      expectNull(
        {
          listing: {
            buildingId,
            visibility: LISTING_VISIBILITIES.PUBLIC,
            isDeleted: false,
            rent: 5000,
          },
        },
        "missing listing id",
      );
    });
  });

  describe("detects eligible public listings", () => {
    test("captures core metadata for a public listing", () => {
      const buildingId = new mongoose.Types.ObjectId();
      const listingId = new mongoose.Types.ObjectId();
      const listedBy = new mongoose.Types.ObjectId();

      expectDetection(
        {
          listing: createPublicListing({
            _id: listingId,
            buildingId,
            listedBy,
            rent: 5200,
          }),
          buildingName: "Test Tower",
        },
        {
          buildingId,
          listingId,
          buildingName: "Test Tower",
          rent: 5200,
          availableAt: null,
          excludeUserId: listedBy,
        },
        "public listing with building name",
      );
    });

    test("uses buildingId from input when provided separately from the listing", () => {
      const listingBuildingId = new mongoose.Types.ObjectId();
      const overrideBuildingId = new mongoose.Types.ObjectId();
      const listingId = new mongoose.Types.ObjectId();
      const listedBy = new mongoose.Types.ObjectId();

      const result = detectNewPublicListing({
        listing: createPublicListing({
          _id: listingId,
          buildingId: listingBuildingId,
          listedBy,
        }),
        buildingId: overrideBuildingId,
      });

      assert.equal(result.buildingId.toString(), overrideBuildingId.toString());
      assert.equal(result.listingId.toString(), listingId.toString());
      assert.equal(result.excludeUserId.toString(), listedBy.toString());
      assert.equal(result.buildingName, null);
    });

    test("accepts listing.id when _id is not present", () => {
      const buildingId = new mongoose.Types.ObjectId();
      const listingId = new mongoose.Types.ObjectId();

      const result = detectNewPublicListing({
        listing: {
          id: listingId,
          buildingId,
          visibility: LISTING_VISIBILITIES.PUBLIC,
          isDeleted: false,
          rent: 4800,
        },
      });

      assert.equal(result.listingId.toString(), listingId.toString());
      assert.equal(result.buildingId.toString(), buildingId.toString());
      assert.equal(result.rent, 4800);
    });

    test("defaults buildingName to null when omitted", () => {
      const result = detectNewPublicListing({
        listing: createPublicListing(),
      });

      assert.equal(result.buildingName, null);
    });

    test("preserves availableAt from the listing", () => {
      const availableAt = new Date("2026-09-01T00:00:00.000Z");
      const listing = createPublicListing({ availableAt });

      const result = detectNewPublicListing({ listing });

      assert.equal(result.availableAt, availableAt);
    });

    test("sets excludeUserId to null when listedBy is missing", () => {
      const result = detectNewPublicListing({
        listing: {
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

  describe("normalizes rent safely", () => {
    test("accepts valid numeric rent values including zero", () => {
      const zeroRent = detectNewPublicListing({
        listing: createPublicListing({ rent: 0 }),
      });
      const fractionalRent = detectNewPublicListing({
        listing: createPublicListing({ rent: 5499.5 }),
      });

      assert.equal(zeroRent.rent, 0);
      assert.equal(fractionalRent.rent, 5499.5);
    });

    test("returns null rent for non-numeric values", () => {
      for (const rent of ["5500", null, undefined, NaN, Infinity]) {
        const result = detectNewPublicListing({
          listing: createPublicListing({ rent }),
        });

        assert.equal(result.rent, null, `expected null rent for ${String(rent)}`);
      }
    });
  });

  describe("is pure and safe for production callers", () => {
    test("does not mutate the listing object", () => {
      const listing = createPublicListing({ rent: 5200 });
      const snapshot = structuredClone({
        ...listing,
        _id: listing._id.toString(),
        buildingId: listing.buildingId.toString(),
        listedBy: listing.listedBy.toString(),
      });

      detectNewPublicListing({
        listing,
        buildingName: "Immutable Tower",
      });

      assert.equal(listing.rent, 5200);
      assert.equal(listing.visibility, LISTING_VISIBILITIES.PUBLIC);
      assert.equal(snapshot.rent, 5200);
    });

    test("returns a fresh object on every successful detection", () => {
      const listing = createPublicListing();

      const first = detectNewPublicListing({ listing, buildingName: "Tower" });
      const second = detectNewPublicListing({ listing, buildingName: "Tower" });

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
        { listing: null },
        { listing: { visibility: LISTING_VISIBILITIES.PRIVATE } },
        { listing: createPublicListing({ _id: undefined, id: undefined }) },
      ];

      for (const input of cases) {
        assert.doesNotThrow(() => detectNewPublicListing(input));
      }
    });
  });
});
