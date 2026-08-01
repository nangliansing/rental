import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  BUILDING_FOLLOWER_CHANGE_TYPES,
  BUILDING_FOLLOWERS_MIN_PRICE_DROP_BAHT,
} from "../modules/building-follow-notify/building-follow-notify.constants.js";
import { detectBuildingPriceDrop } from "../modules/building-follow-notify/detectors/detect-building-price-drop.js";

const expectNull = (input, label) => {
  assert.equal(
    detectBuildingPriceDrop(input),
    null,
    `expected null for ${label}`,
  );
};

const expectDrop = (input, expected, label) => {
  const result = detectBuildingPriceDrop(input);

  assert.deepEqual(
    result,
    {
      changeType: BUILDING_FOLLOWER_CHANGE_TYPES.PRICE_DROPPED,
      ...expected,
    },
    `expected price drop for ${label}`,
  );

  assert.equal(Object.keys(result).length, 3, "result must only expose expected fields");
};

describe("detectBuildingPriceDrop", () => {
  describe("returns null for missing or invalid rent values", () => {
    test("rejects calls with no arguments or an empty payload", () => {
      expectNull(undefined, "no arguments");
      expectNull({}, "empty object");
    });

    test("rejects null and undefined rent fields", () => {
      expectNull({ oldMinRent: null, newMinRent: 5000 }, "null oldMinRent");
      expectNull({ oldMinRent: 6000, newMinRent: null }, "null newMinRent");
      expectNull(
        { oldMinRent: undefined, newMinRent: 5000 },
        "undefined oldMinRent",
      );
      expectNull(
        { oldMinRent: 6000, newMinRent: undefined },
        "undefined newMinRent",
      );
      expectNull({ oldMinRent: null, newMinRent: null }, "both null");
    });

    test("rejects non-numeric rent values", () => {
      expectNull(
        { oldMinRent: "6000", newMinRent: 5000 },
        "string oldMinRent",
      );
      expectNull(
        { oldMinRent: 6000, newMinRent: "5000" },
        "string newMinRent",
      );
      expectNull({ oldMinRent: NaN, newMinRent: 5000 }, "NaN oldMinRent");
      expectNull({ oldMinRent: 6000, newMinRent: NaN }, "NaN newMinRent");
      expectNull(
        { oldMinRent: Infinity, newMinRent: 5000 },
        "Infinity oldMinRent",
      );
      expectNull(
        { oldMinRent: 6000, newMinRent: -Infinity },
        "-Infinity newMinRent",
      );
    });

    test("rejects negative rents", () => {
      expectNull({ oldMinRent: -1, newMinRent: 5000 }, "negative oldMinRent");
      expectNull({ oldMinRent: 6000, newMinRent: -1 }, "negative newMinRent");
      expectNull({ oldMinRent: -100, newMinRent: -200 }, "both negative");
    });
  });

  describe("returns null when rent does not decrease enough", () => {
    test("rejects unchanged or increased min rent", () => {
      expectNull({ oldMinRent: 6000, newMinRent: 6000 }, "unchanged rent");
      expectNull({ oldMinRent: 6000, newMinRent: 6500 }, "increased rent");
      expectNull({ oldMinRent: 0, newMinRent: 0 }, "both zero");
      expectNull({ oldMinRent: 0, newMinRent: 100 }, "increase from zero");
    });

    test("rejects drops below the default minimum threshold", () => {
      expectNull(
        { oldMinRent: 6000, newMinRent: 5999 },
        "1 baht drop",
      );
      expectNull(
        { oldMinRent: 6000, newMinRent: 5901 },
        "99 baht drop",
      );
    });

    test("rejects drops below a custom minDropBaht threshold", () => {
      expectNull(
        {
          oldMinRent: 10_000,
          newMinRent: 9750,
          minDropBaht: 300,
        },
        "250 baht drop with 300 baht threshold",
      );
    });
  });

  describe("detects valid price drops", () => {
    test("accepts a drop exactly at the default minimum threshold", () => {
      expectDrop(
        { oldMinRent: 6000, newMinRent: 5900 },
        { oldMinRent: 6000, newMinRent: 5900 },
        "exactly 100 baht drop",
      );
    });

    test("uses BUILDING_FOLLOWERS_MIN_PRICE_DROP_BAHT when minDropBaht is omitted", () => {
      const threshold = BUILDING_FOLLOWERS_MIN_PRICE_DROP_BAHT;

      expectNull(
        {
          oldMinRent: 5000,
          newMinRent: 5000 - threshold + 1,
        },
        "one baht below default threshold",
      );

      expectDrop(
        {
          oldMinRent: 5000,
          newMinRent: 5000 - threshold,
        },
        {
          oldMinRent: 5000,
          newMinRent: 5000 - threshold,
        },
        "exactly at default threshold",
      );
    });

    test("accepts a drop exactly at a custom minDropBaht threshold", () => {
      expectDrop(
        {
          oldMinRent: 12_000,
          newMinRent: 11_700,
          minDropBaht: 300,
        },
        { oldMinRent: 12_000, newMinRent: 11_700 },
        "exactly 300 baht custom threshold",
      );
    });

    test("accepts large production-style drops", () => {
      expectDrop(
        { oldMinRent: 18_500, newMinRent: 15_900 },
        { oldMinRent: 18_500, newMinRent: 15_900 },
        "typical condo price drop",
      );
    });

    test("accepts fractional baht values when the drop is still meaningful", () => {
      expectDrop(
        { oldMinRent: 6000.75, newMinRent: 5900.5 },
        { oldMinRent: 6000.75, newMinRent: 5900.5 },
        "fractional rent values",
      );
    });

    test("accepts dropping min rent all the way to zero", () => {
      expectDrop(
        { oldMinRent: 5000, newMinRent: 0 },
        { oldMinRent: 5000, newMinRent: 0 },
        "drop to zero from positive min rent",
      );
    });

    test("accepts minDropBaht of zero for any decrease", () => {
      expectDrop(
        {
          oldMinRent: 6000,
          newMinRent: 5999,
          minDropBaht: 0,
        },
        { oldMinRent: 6000, newMinRent: 5999 },
        "1 baht drop with zero threshold",
      );
    });
  });

  describe("is pure and safe for production callers", () => {
    test("does not mutate the input object", () => {
      const input = {
        oldMinRent: 7000,
        newMinRent: 5500,
        minDropBaht: 100,
      };
      const snapshot = structuredClone(input);

      detectBuildingPriceDrop(input);

      assert.deepEqual(input, snapshot);
    });

    test("returns a fresh object on every successful detection", () => {
      const first = detectBuildingPriceDrop({
        oldMinRent: 7000,
        newMinRent: 5500,
      });
      const second = detectBuildingPriceDrop({
        oldMinRent: 7000,
        newMinRent: 5500,
      });

      assert.notEqual(first, second);
      assert.deepEqual(first, second);
    });

    test("never throws for malformed caller input", () => {
      const cases = [
        undefined,
        {},
        { oldMinRent: "oops" },
        { oldMinRent: 6000, newMinRent: 6500 },
        { oldMinRent: 6000, newMinRent: 5999, minDropBaht: "100" },
      ];

      for (const input of cases) {
        assert.doesNotThrow(() => detectBuildingPriceDrop(input));
      }
    });
  });
});
