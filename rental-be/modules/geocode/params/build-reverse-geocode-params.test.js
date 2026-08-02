import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { AppError } from "../../../shared/errors/app-error.js";
import { buildReverseGeocodeParams } from "./build-reverse-geocode-params.js";

const expectValidationError = (fn, expectedMessagePart) => {
  assert.throws(
    fn,
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 422);
      assert.equal(error.code, "VALIDATION_ERROR");
      assert.match(error.message, expectedMessagePart);
      return true;
    },
  );
};

describe("buildReverseGeocodeParams", () => {
  describe("when the request body is not a valid object", () => {
    test("rejects null", () => {
      expectValidationError(
        () => buildReverseGeocodeParams(null),
        /body must be an object/,
      );
    });

    test("rejects undefined", () => {
      expectValidationError(
        () => buildReverseGeocodeParams(undefined),
        /body must be an object/,
      );
    });

    test("rejects an array", () => {
      expectValidationError(
        () => buildReverseGeocodeParams([13.7563, 100.5018]),
        /body must be an object/,
      );
    });

    test("rejects a string", () => {
      expectValidationError(
        () => buildReverseGeocodeParams("13.7563,100.5018"),
        /body must be an object/,
      );
    });
  });

  describe("when latitude or longitude is missing", () => {
    test("rejects a body with no coordinates", () => {
      expectValidationError(
        () => buildReverseGeocodeParams({}),
        /lat is required/,
      );
    });

    test("rejects missing latitude", () => {
      expectValidationError(
        () => buildReverseGeocodeParams({ lng: 100.5018 }),
        /lat is required/,
      );
    });

    test("rejects missing longitude", () => {
      expectValidationError(
        () => buildReverseGeocodeParams({ lat: 13.7563 }),
        /lng is required/,
      );
    });

    test("rejects null latitude", () => {
      expectValidationError(
        () => buildReverseGeocodeParams({ lat: null, lng: 100.5018 }),
        /lat is required/,
      );
    });

    test("rejects null longitude", () => {
      expectValidationError(
        () => buildReverseGeocodeParams({ lat: 13.7563, lng: null }),
        /lng is required/,
      );
    });
  });

  describe("when coordinates are not finite numbers", () => {
    test("rejects string latitude", () => {
      expectValidationError(
        () => buildReverseGeocodeParams({ lat: "13.7563", lng: 100.5018 }),
        /lat must be a number/,
      );
    });

    test("rejects string longitude", () => {
      expectValidationError(
        () => buildReverseGeocodeParams({ lat: 13.7563, lng: "100.5018" }),
        /lng must be a number/,
      );
    });

    test("rejects NaN latitude", () => {
      expectValidationError(
        () => buildReverseGeocodeParams({ lat: Number.NaN, lng: 100.5018 }),
        /lat must be a number/,
      );
    });

    test("rejects infinite longitude", () => {
      expectValidationError(
        () =>
          buildReverseGeocodeParams({
            lat: 13.7563,
            lng: Number.POSITIVE_INFINITY,
          }),
        /lng must be a number/,
      );
    });

    test("rejects boolean coordinates", () => {
      expectValidationError(
        () => buildReverseGeocodeParams({ lat: true, lng: false }),
        /lat must be a number/,
      );
    });
  });

  describe("when latitude is outside the valid range", () => {
    test("rejects latitude below -90", () => {
      expectValidationError(
        () => buildReverseGeocodeParams({ lat: -90.0001, lng: 0 }),
        /lat must be between -90 and 90/,
      );
    });

    test("rejects latitude above 90", () => {
      expectValidationError(
        () => buildReverseGeocodeParams({ lat: 90.0001, lng: 0 }),
        /lat must be between -90 and 90/,
      );
    });

    test("accepts latitude at the south pole boundary", () => {
      assert.deepEqual(
        buildReverseGeocodeParams({ lat: -90, lng: 0 }),
        { lat: -90, lng: 0 },
      );
    });

    test("accepts latitude at the north pole boundary", () => {
      assert.deepEqual(
        buildReverseGeocodeParams({ lat: 90, lng: 0 }),
        { lat: 90, lng: 0 },
      );
    });
  });

  describe("when longitude is outside the valid range", () => {
    test("rejects longitude below -180", () => {
      expectValidationError(
        () => buildReverseGeocodeParams({ lat: 0, lng: -180.0001 }),
        /lng must be between -180 and 180/,
      );
    });

    test("rejects longitude above 180", () => {
      expectValidationError(
        () => buildReverseGeocodeParams({ lat: 0, lng: 180.0001 }),
        /lng must be between -180 and 180/,
      );
    });

    test("accepts longitude at the anti-meridian west boundary", () => {
      assert.deepEqual(
        buildReverseGeocodeParams({ lat: 0, lng: -180 }),
        { lat: 0, lng: -180 },
      );
    });

    test("accepts longitude at the anti-meridian east boundary", () => {
      assert.deepEqual(
        buildReverseGeocodeParams({ lat: 0, lng: 180 }),
        { lat: 0, lng: 180 },
      );
    });
  });

  describe("when coordinates are valid", () => {
    test("accepts typical Bangkok coordinates", () => {
      assert.deepEqual(
        buildReverseGeocodeParams({ lat: 13.7563, lng: 100.5018 }),
        { lat: 13.7563, lng: 100.5018 },
      );
    });

    test("accepts negative coordinates in both hemispheres", () => {
      assert.deepEqual(
        buildReverseGeocodeParams({ lat: -33.8688, lng: -151.2093 }),
        { lat: -33.8688, lng: -151.2093 },
      );
    });

    test("accepts high-precision fractional coordinates", () => {
      assert.deepEqual(
        buildReverseGeocodeParams({ lat: 13.7563312, lng: 100.5017654 }),
        { lat: 13.7563312, lng: 100.5017654 },
      );
    });

    test("accepts the origin", () => {
      assert.deepEqual(
        buildReverseGeocodeParams({ lat: 0, lng: 0 }),
        { lat: 0, lng: 0 },
      );
    });

    test("does not mutate the input body", () => {
      const body = { lat: 13.7563, lng: 100.5018, extra: "ignored" };

      buildReverseGeocodeParams(body);

      assert.deepEqual(body, {
        lat: 13.7563,
        lng: 100.5018,
        extra: "ignored",
      });
    });

    test("ignores unrelated body fields", () => {
      assert.deepEqual(
        buildReverseGeocodeParams({
          lat: 13.7563,
          lng: 100.5018,
          label: "home",
        }),
        { lat: 13.7563, lng: 100.5018 },
      );
    });
  });
});
