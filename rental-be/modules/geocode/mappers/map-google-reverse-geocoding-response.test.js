import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { AppError } from "../../../shared/errors/app-error.js";
import { mapGoogleReverseGeocodingResponse } from "./map-google-reverse-geocoding-response.js";

const expectAppError = (fn, { statusCode, code, messagePart }) => {
  assert.throws(
    fn,
    (error) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, statusCode);
      assert.equal(error.code, code);
      assert.match(error.message, messagePart);
      return true;
    },
  );
};

const validGooglePayload = (overrides = {}) => ({
  status: "OK",
  results: [
    {
      formatted_address: "123 Sukhumvit Rd, Bangkok, Thailand",
      place_id: "place-123",
    },
  ],
  ...overrides,
});

describe("mapGoogleReverseGeocodingResponse", () => {
  describe("when the provider payload is not a valid object", () => {
    test("rejects null", () => {
      expectAppError(() => mapGoogleReverseGeocodingResponse(null), {
        statusCode: 502,
        code: "GEOCODE_PROVIDER_ERROR",
        messagePart: /Reverse geocoding response is invalid/,
      });
    });

    test("rejects undefined", () => {
      expectAppError(() => mapGoogleReverseGeocodingResponse(undefined), {
        statusCode: 502,
        code: "GEOCODE_PROVIDER_ERROR",
        messagePart: /Reverse geocoding response is invalid/,
      });
    });

    test("rejects a string payload", () => {
      expectAppError(() => mapGoogleReverseGeocodingResponse("OK"), {
        statusCode: 502,
        code: "GEOCODE_PROVIDER_ERROR",
        messagePart: /Reverse geocoding response is invalid/,
      });
    });

    test("rejects a numeric payload", () => {
      expectAppError(() => mapGoogleReverseGeocodingResponse(200), {
        statusCode: 502,
        code: "GEOCODE_PROVIDER_ERROR",
        messagePart: /Reverse geocoding response is invalid/,
      });
    });
  });

  describe("when Google returns ZERO_RESULTS", () => {
    test("throws a not-found error", () => {
      expectAppError(
        () =>
          mapGoogleReverseGeocodingResponse({
            status: "ZERO_RESULTS",
            results: [],
          }),
        {
          statusCode: 404,
          code: "GEOCODE_NOT_FOUND",
          messagePart: /No address was found for the provided coordinates/,
        },
      );
    });
  });

  describe("when Google returns a non-success status", () => {
    test("rejects OVER_QUERY_LIMIT as temporarily unavailable", () => {
      expectAppError(
        () => mapGoogleReverseGeocodingResponse({ status: "OVER_QUERY_LIMIT" }),
        {
          statusCode: 503,
          code: "GEOCODE_UNAVAILABLE",
          messagePart: /temporarily unavailable/,
        },
      );
    });

    test("rejects REQUEST_DENIED as a server key configuration error", () => {
      expectAppError(
        () =>
          mapGoogleReverseGeocodingResponse({
            status: "REQUEST_DENIED",
            error_message:
              "This API key is not authorized to use this service or API.",
          }),
        {
          statusCode: 503,
          code: "GEOCODE_REQUEST_DENIED",
          messagePart: /server-restricted Google Maps API key/,
        },
      );
    });

    test("includes Google error details in development for REQUEST_DENIED", () => {
      expectAppError(
        () =>
          mapGoogleReverseGeocodingResponse(
            {
              status: "REQUEST_DENIED",
              error_message:
                "This API key is not authorized to use this service or API.",
            },
            { includeProviderDetails: true },
          ),
        {
          statusCode: 503,
          code: "GEOCODE_REQUEST_DENIED",
          messagePart: /denied by Google: This API key is not authorized/,
        },
      );
    });

    test("rejects INVALID_REQUEST as temporarily unavailable", () => {
      expectAppError(
        () => mapGoogleReverseGeocodingResponse({ status: "INVALID_REQUEST" }),
        {
          statusCode: 503,
          code: "GEOCODE_UNAVAILABLE",
          messagePart: /temporarily unavailable/,
        },
      );
    });

    test("rejects UNKNOWN_ERROR as temporarily unavailable", () => {
      expectAppError(
        () => mapGoogleReverseGeocodingResponse({ status: "UNKNOWN_ERROR" }),
        {
          statusCode: 503,
          code: "GEOCODE_UNAVAILABLE",
          messagePart: /temporarily unavailable/,
        },
      );
    });

    test("rejects a missing status as temporarily unavailable", () => {
      expectAppError(
        () => mapGoogleReverseGeocodingResponse({ results: [] }),
        {
          statusCode: 503,
          code: "GEOCODE_UNAVAILABLE",
          messagePart: /temporarily unavailable/,
        },
      );
    });

    test("rejects a non-string status as temporarily unavailable", () => {
      expectAppError(
        () => mapGoogleReverseGeocodingResponse({ status: 200 }),
        {
          statusCode: 503,
          code: "GEOCODE_UNAVAILABLE",
          messagePart: /temporarily unavailable/,
        },
      );
    });

    test("rejects an empty status string as temporarily unavailable", () => {
      expectAppError(
        () => mapGoogleReverseGeocodingResponse({ status: "" }),
        {
          statusCode: 503,
          code: "GEOCODE_UNAVAILABLE",
          messagePart: /temporarily unavailable/,
        },
      );
    });
  });

  describe("when Google returns OK but the payload is incomplete", () => {
    test("rejects a missing results array", () => {
      expectAppError(
        () => mapGoogleReverseGeocodingResponse({ status: "OK" }),
        {
          statusCode: 502,
          code: "GEOCODE_PROVIDER_ERROR",
          messagePart: /missing required data/,
        },
      );
    });

    test("rejects an empty results array", () => {
      expectAppError(
        () =>
          mapGoogleReverseGeocodingResponse({
            status: "OK",
            results: [],
          }),
        {
          statusCode: 502,
          code: "GEOCODE_PROVIDER_ERROR",
          messagePart: /missing required data/,
        },
      );
    });

    test("rejects a missing formatted_address on the first result", () => {
      expectAppError(
        () =>
          mapGoogleReverseGeocodingResponse({
            status: "OK",
            results: [{ place_id: "place-123" }],
          }),
        {
          statusCode: 502,
          code: "GEOCODE_PROVIDER_ERROR",
          messagePart: /missing required data/,
        },
      );
    });

    test("rejects an empty formatted_address", () => {
      expectAppError(
        () =>
          mapGoogleReverseGeocodingResponse({
            status: "OK",
            results: [{ formatted_address: "", place_id: "place-123" }],
          }),
        {
          statusCode: 502,
          code: "GEOCODE_PROVIDER_ERROR",
          messagePart: /missing required data/,
        },
      );
    });

    test("rejects a whitespace-only formatted_address", () => {
      expectAppError(
        () =>
          mapGoogleReverseGeocodingResponse({
            status: "OK",
            results: [{ formatted_address: "   ", place_id: "place-123" }],
          }),
        {
          statusCode: 502,
          code: "GEOCODE_PROVIDER_ERROR",
          messagePart: /missing required data/,
        },
      );
    });

    test("rejects a non-string formatted_address", () => {
      expectAppError(
        () =>
          mapGoogleReverseGeocodingResponse({
            status: "OK",
            results: [{ formatted_address: 123, place_id: "place-123" }],
          }),
        {
          statusCode: 502,
          code: "GEOCODE_PROVIDER_ERROR",
          messagePart: /missing required data/,
        },
      );
    });
  });

  describe("when Google returns a valid OK payload", () => {
    test("maps formattedAddress and placeId from the first result", () => {
      assert.deepEqual(
        mapGoogleReverseGeocodingResponse(validGooglePayload()),
        {
          formattedAddress: "123 Sukhumvit Rd, Bangkok, Thailand",
          placeId: "place-123",
        },
      );
    });

    test("trims whitespace from formattedAddress", () => {
      assert.deepEqual(
        mapGoogleReverseGeocodingResponse(
          validGooglePayload({
            results: [
              {
                formatted_address: "  123 Sukhumvit Rd, Bangkok, Thailand  ",
                place_id: "place-123",
              },
            ],
          }),
        ),
        {
          formattedAddress: "123 Sukhumvit Rd, Bangkok, Thailand",
          placeId: "place-123",
        },
      );
    });

    test("returns null placeId when place_id is missing", () => {
      assert.deepEqual(
        mapGoogleReverseGeocodingResponse(
          validGooglePayload({
            results: [
              {
                formatted_address: "123 Sukhumvit Rd, Bangkok, Thailand",
              },
            ],
          }),
        ),
        {
          formattedAddress: "123 Sukhumvit Rd, Bangkok, Thailand",
          placeId: null,
        },
      );
    });

    test("returns null placeId when place_id is not a string", () => {
      assert.deepEqual(
        mapGoogleReverseGeocodingResponse(
          validGooglePayload({
            results: [
              {
                formatted_address: "123 Sukhumvit Rd, Bangkok, Thailand",
                place_id: 12345,
              },
            ],
          }),
        ),
        {
          formattedAddress: "123 Sukhumvit Rd, Bangkok, Thailand",
          placeId: null,
        },
      );
    });

    test("uses only the first result when multiple are returned", () => {
      assert.deepEqual(
        mapGoogleReverseGeocodingResponse(
          validGooglePayload({
            results: [
              {
                formatted_address: "First address",
                place_id: "place-first",
              },
              {
                formatted_address: "Second address",
                place_id: "place-second",
              },
            ],
          }),
        ),
        {
          formattedAddress: "First address",
          placeId: "place-first",
        },
      );
    });

    test("does not mutate the input payload", () => {
      const payload = validGooglePayload({
        results: [
          {
            formatted_address: "  123 Sukhumvit Rd  ",
            place_id: "place-123",
          },
        ],
      });

      mapGoogleReverseGeocodingResponse(payload);

      assert.equal(payload.results[0].formatted_address, "  123 Sukhumvit Rd  ");
    });
  });
});
