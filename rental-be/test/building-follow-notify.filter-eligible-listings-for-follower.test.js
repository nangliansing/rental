import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { filterEligibleListingsForFollower } from "../modules/building-follow-notify/utils/merge-building-followers-notify-job-data.js";

const FOLLOWED_AT = "2026-08-01T10:30:00.000Z";

const listing = (listingId, occurredAt, overrides = {}) => ({
  listingId,
  occurredAt,
  ...overrides,
});

const sampleListings = () => [
  listing("a", "2026-08-01T10:00:00.000Z"),
  listing("b", "2026-08-01T11:00:00.000Z"),
  listing("c", "2026-08-01T12:00:00.000Z"),
];

describe("filterEligibleListingsForFollower", () => {
  describe("rejects invalid input", () => {
    test("returns an empty array when follower is missing", () => {
      assert.deepEqual(filterEligibleListingsForFollower(null, sampleListings()), []);
      assert.deepEqual(filterEligibleListingsForFollower(undefined, sampleListings()), []);
    });

    test("returns an empty array when follower.createdAt is missing", () => {
      assert.deepEqual(filterEligibleListingsForFollower({}, sampleListings()), []);
      assert.deepEqual(
        filterEligibleListingsForFollower({ createdAt: null }, sampleListings()),
        [],
      );
    });

    test("returns an empty array when listings is not an array", () => {
      assert.deepEqual(
        filterEligibleListingsForFollower({ createdAt: FOLLOWED_AT }, null),
        [],
      );
      assert.deepEqual(
        filterEligibleListingsForFollower({ createdAt: FOLLOWED_AT }, undefined),
        [],
      );
      assert.deepEqual(
        filterEligibleListingsForFollower({ createdAt: FOLLOWED_AT }, "listings"),
        [],
      );
    });
  });

  describe("filters listings by follow date", () => {
    test("keeps listings that occurred on or after the follower joined", () => {
      const eligible = filterEligibleListingsForFollower(
        { createdAt: new Date(FOLLOWED_AT) },
        sampleListings(),
      );

      assert.deepEqual(
        eligible.map((entry) => entry.listingId),
        ["b", "c"],
      );
    });

    test("includes a listing when follow date exactly matches occurredAt", () => {
      const eligible = filterEligibleListingsForFollower(
        { createdAt: new Date("2026-08-01T11:00:00.000Z") },
        [listing("exact-match", "2026-08-01T11:00:00.000Z")],
      );

      assert.deepEqual(
        eligible.map((entry) => entry.listingId),
        ["exact-match"],
      );
    });

    test("excludes listings that occurred before the follower joined", () => {
      const eligible = filterEligibleListingsForFollower(
        { createdAt: new Date("2026-08-01T12:30:00.000Z") },
        sampleListings(),
      );

      assert.deepEqual(eligible, []);
    });

    test("accepts follower.createdAt as an ISO string", () => {
      const eligible = filterEligibleListingsForFollower(
        { createdAt: FOLLOWED_AT },
        sampleListings(),
      );

      assert.deepEqual(
        eligible.map((entry) => entry.listingId),
        ["b", "c"],
      );
    });

    test("returns an empty array when listings is empty", () => {
      assert.deepEqual(
        filterEligibleListingsForFollower({ createdAt: FOLLOWED_AT }, []),
        [],
      );
    });
  });

  describe("skips listings with invalid occurredAt values", () => {
    test("excludes listings without occurredAt", () => {
      const eligible = filterEligibleListingsForFollower(
        { createdAt: FOLLOWED_AT },
        [listing("missing-date"), listing("valid", "2026-08-01T11:00:00.000Z")],
      );

      assert.deepEqual(
        eligible.map((entry) => entry.listingId),
        ["valid"],
      );
    });

    test("excludes listings with invalid occurredAt values", () => {
      const eligible = filterEligibleListingsForFollower(
        { createdAt: FOLLOWED_AT },
        [
          listing("invalid-date", "not-a-date"),
          listing("valid", "2026-08-01T11:00:00.000Z"),
        ],
      );

      assert.deepEqual(
        eligible.map((entry) => entry.listingId),
        ["valid"],
      );
    });
  });

  describe("is pure and does not mutate inputs", () => {
    test("leaves follower and listings unchanged", () => {
      const follower = { createdAt: new Date(FOLLOWED_AT) };
      const listings = sampleListings();
      const followerSnapshot = structuredClone(follower);
      const listingsSnapshot = structuredClone(listings);

      filterEligibleListingsForFollower(follower, listings);

      assert.deepEqual(follower, followerSnapshot);
      assert.deepEqual(listings, listingsSnapshot);
    });

    test("returns the original listing object references", () => {
      const listings = sampleListings();

      const eligible = filterEligibleListingsForFollower(
        { createdAt: FOLLOWED_AT },
        listings,
      );

      assert.equal(eligible[0], listings[1]);
      assert.equal(eligible[1], listings[2]);
    });
  });
});
