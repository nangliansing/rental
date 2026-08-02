import assert from "node:assert/strict";
import { beforeEach, describe, mock, test } from "node:test";

import { AppError } from "../../../shared/errors/app-error.js";
import { GEOCODE_SOURCE } from "../geocode.constants.js";

const mockState = {
  resolveCalls: [],
  resolveResult: {
    lat: 13.75633,
    lng: 100.50177,
    formattedAddress: "123 Sukhumvit Rd, Bangkok, Thailand",
    placeId: "place-123",
    source: GEOCODE_SOURCE.GOOGLE,
    cached: false,
    fetchedAt: "2026-08-02T05:00:00.000Z",
  },
  resolveError: null,
};

const validBody = {
  lat: 13.756331,
  lng: 100.501765,
};

mock.module("./resolve-reverse-geocode-address.service.js", {
  namedExports: {
    resolveReverseGeocodeAddress: async ({ lat, lng, session = null }) => {
      mockState.resolveCalls.push({ lat, lng, session });

      if (mockState.resolveError) {
        throw mockState.resolveError;
      }

      return mockState.resolveResult;
    },
  },
});

const { reverseGeocodeService } = await import("./reverse-geocode.service.js");

const expectAppError = async (fn, { statusCode, code, messagePart }) => {
  await assert.rejects(fn, (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, statusCode);
    assert.equal(error.code, code);
    assert.match(error.message, messagePart);
    return true;
  });
};

const resetMockState = () => {
  mockState.resolveCalls = [];
  mockState.resolveError = null;
  mockState.resolveResult = {
    lat: 13.75633,
    lng: 100.50177,
    formattedAddress: "123 Sukhumvit Rd, Bangkok, Thailand",
    placeId: "place-123",
    source: GEOCODE_SOURCE.GOOGLE,
    cached: false,
    fetchedAt: "2026-08-02T05:00:00.000Z",
  };
};

describe("reverseGeocodeService", () => {
  beforeEach(() => {
    resetMockState();
  });

  describe("when the request body is valid", () => {
    test("returns the resolved reverse geocode result", async () => {
      const result = await reverseGeocodeService({ bodyInput: validBody });

      assert.deepEqual(result, mockState.resolveResult);
    });

    test("delegates parsed coordinates to resolveReverseGeocodeAddress", async () => {
      await reverseGeocodeService({ bodyInput: validBody });

      assert.equal(mockState.resolveCalls.length, 1);
      assert.deepEqual(mockState.resolveCalls[0], {
        lat: 13.756331,
        lng: 100.501765,
        session: null,
      });
    });

    test("passes the session through to resolveReverseGeocodeAddress", async () => {
      const session = { id: "session-1" };

      await reverseGeocodeService({ bodyInput: validBody, session });

      assert.equal(mockState.resolveCalls[0].session, session);
    });

    test("accepts boundary coordinates", async () => {
      await reverseGeocodeService({
        bodyInput: { lat: 90, lng: 180 },
      });

      assert.deepEqual(mockState.resolveCalls[0], {
        lat: 90,
        lng: 180,
        session: null,
      });
    });
  });

  describe("when the request body is invalid", () => {
    test("rejects a missing body without calling resolveReverseGeocodeAddress", async () => {
      await expectAppError(() => reverseGeocodeService({ bodyInput: undefined }), {
        statusCode: 422,
        code: "VALIDATION_ERROR",
        messagePart: /body must be an object/,
      });

      assert.equal(mockState.resolveCalls.length, 0);
    });

    test("rejects missing latitude", async () => {
      await expectAppError(
        () => reverseGeocodeService({ bodyInput: { lng: 100.501765 } }),
        {
          statusCode: 422,
          code: "VALIDATION_ERROR",
          messagePart: /lat is required/,
        },
      );

      assert.equal(mockState.resolveCalls.length, 0);
    });

    test("rejects missing longitude", async () => {
      await expectAppError(
        () => reverseGeocodeService({ bodyInput: { lat: 13.756331 } }),
        {
          statusCode: 422,
          code: "VALIDATION_ERROR",
          messagePart: /lng is required/,
        },
      );

      assert.equal(mockState.resolveCalls.length, 0);
    });

    test("rejects latitude outside the valid range", async () => {
      await expectAppError(
        () =>
          reverseGeocodeService({
            bodyInput: { lat: 91, lng: 100.501765 },
          }),
        {
          statusCode: 422,
          code: "VALIDATION_ERROR",
          messagePart: /lat must be between -90 and 90/,
        },
      );

      assert.equal(mockState.resolveCalls.length, 0);
    });

    test("rejects longitude outside the valid range", async () => {
      await expectAppError(
        () =>
          reverseGeocodeService({
            bodyInput: { lat: 13.756331, lng: 181 },
          }),
        {
          statusCode: 422,
          code: "VALIDATION_ERROR",
          messagePart: /lng must be between -180 and 180/,
        },
      );

      assert.equal(mockState.resolveCalls.length, 0);
    });

    test("rejects non-numeric coordinates", async () => {
      await expectAppError(
        () =>
          reverseGeocodeService({
            bodyInput: { lat: "13.756331", lng: 100.501765 },
          }),
        {
          statusCode: 422,
          code: "VALIDATION_ERROR",
          messagePart: /lat must be a number/,
        },
      );

      assert.equal(mockState.resolveCalls.length, 0);
    });
  });

  describe("when session validation fails", () => {
    test("rejects a non-object session before resolving the address", async () => {
      await expectAppError(
        () =>
          reverseGeocodeService({
            bodyInput: validBody,
            session: "invalid-session",
          }),
        {
          statusCode: 422,
          code: "VALIDATION_ERROR",
          messagePart: /session must be an object/,
        },
      );

      assert.equal(mockState.resolveCalls.length, 0);
    });

    test("accepts a null session", async () => {
      await reverseGeocodeService({ bodyInput: validBody, session: null });

      assert.equal(mockState.resolveCalls[0].session, null);
    });
  });

  describe("when resolveReverseGeocodeAddress fails", () => {
    test("propagates GEOCODE_NOT_FOUND errors", async () => {
      mockState.resolveError = new AppError(
        "No address was found for the provided coordinates",
        404,
        "GEOCODE_NOT_FOUND",
      );

      await expectAppError(
        () => reverseGeocodeService({ bodyInput: validBody }),
        {
          statusCode: 404,
          code: "GEOCODE_NOT_FOUND",
          messagePart: /No address was found for the provided coordinates/,
        },
      );
    });

    test("propagates GEOCODE_UNAVAILABLE errors", async () => {
      mockState.resolveError = new AppError(
        "Reverse geocoding is temporarily unavailable",
        503,
        "GEOCODE_UNAVAILABLE",
      );

      await expectAppError(
        () => reverseGeocodeService({ bodyInput: validBody }),
        {
          statusCode: 503,
          code: "GEOCODE_UNAVAILABLE",
          messagePart: /temporarily unavailable/,
        },
      );
    });
  });
});
