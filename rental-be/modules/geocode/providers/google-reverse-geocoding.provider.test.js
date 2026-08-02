import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, mock, test } from "node:test";

import { AppError } from "../../../shared/errors/app-error.js";

const GOOGLE_GEOCODING_TIMEOUT_MS = 50;

const mockState = {
  geocodeEnabled: true,
  googleMapsApiKey: "test-geocode-key",
  fetchCalls: [],
  fetchResponse: null,
  fetchError: null,
  fetchBehavior: null,
};

const validGooglePayload = () => ({
  status: "OK",
  results: [
    {
      formatted_address: "123 Sukhumvit Rd, Bangkok, Thailand",
      place_id: "place-123",
    },
  ],
});

const resolveFetchUrl = (input) => {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.href;
  }

  return input.url;
};

const expectAppError = async (fn, { statusCode, code, messagePart }) => {
  await assert.rejects(fn, (error) => {
    assert.ok(error instanceof AppError);
    assert.equal(error.statusCode, statusCode);
    assert.equal(error.code, code);
    assert.match(error.message, messagePart);
    return true;
  });
};

mock.module("../../../config/index.js", {
  namedExports: {
    getEnvironment: () => ({
      nodeEnv: "development",
      geocode: {
        enabled: mockState.geocodeEnabled,
        googleMapsApiKey: mockState.googleMapsApiKey,
      },
    }),
  },
});

mock.module("../geocode.constants.js", {
  namedExports: {
    GEOCODE_CACHE_COORDINATE_DECIMALS: 5,
    GOOGLE_GEOCODING_TIMEOUT_MS,
  },
});

const { queryGoogleReverseGeocoding } = await import(
  "./google-reverse-geocoding.provider.js"
);

let fetchMock;

const resetMockState = () => {
  mockState.geocodeEnabled = true;
  mockState.googleMapsApiKey = "test-geocode-key";
  mockState.fetchCalls = [];
  mockState.fetchResponse = {
    ok: true,
    status: 200,
    json: async () => validGooglePayload(),
  };
  mockState.fetchError = null;
  mockState.fetchBehavior = null;
};

const installFetchMock = () => {
  fetchMock = mock.method(globalThis, "fetch", async (input, init) => {
    mockState.fetchCalls.push({ input, init });

    if (mockState.fetchBehavior) {
      return mockState.fetchBehavior({ input, init });
    }

    if (mockState.fetchError) {
      throw mockState.fetchError;
    }

    const response = mockState.fetchResponse;

    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: response.json ?? (async () => validGooglePayload()),
    };
  });
};

describe("queryGoogleReverseGeocoding", () => {
  beforeEach(() => {
    resetMockState();
    installFetchMock();
  });

  afterEach(() => {
    fetchMock?.mock.restore();
  });

  describe("when reverse geocoding is disabled", () => {
    test("throws GEOCODE_DISABLED without calling Google", async () => {
      mockState.geocodeEnabled = false;

      await expectAppError(
        () => queryGoogleReverseGeocoding({ lat: 13.756331, lng: 100.501765 }),
        {
          statusCode: 503,
          code: "GEOCODE_DISABLED",
          messagePart: /Reverse geocoding is disabled/,
        },
      );

      assert.equal(mockState.fetchCalls.length, 0);
    });
  });

  describe("when the Google Maps API key is missing", () => {
    test("throws GEOCODE_NOT_CONFIGURED without calling Google", async () => {
      mockState.googleMapsApiKey = "";

      await expectAppError(
        () => queryGoogleReverseGeocoding({ lat: 13.756331, lng: 100.501765 }),
        {
          statusCode: 503,
          code: "GEOCODE_NOT_CONFIGURED",
          messagePart: /Reverse geocoding is not configured/,
        },
      );

      assert.equal(mockState.fetchCalls.length, 0);
    });

    test("throws GEOCODE_NOT_CONFIGURED when the API key is null", async () => {
      mockState.googleMapsApiKey = null;

      await expectAppError(
        () => queryGoogleReverseGeocoding({ lat: 13.756331, lng: 100.501765 }),
        {
          statusCode: 503,
          code: "GEOCODE_NOT_CONFIGURED",
          messagePart: /Reverse geocoding is not configured/,
        },
      );

      assert.equal(mockState.fetchCalls.length, 0);
    });
  });

  describe("when Google returns a successful response", () => {
    test("returns the mapped formatted address and place ID", async () => {
      const result = await queryGoogleReverseGeocoding({
        lat: 13.756331,
        lng: 100.501765,
      });

      assert.deepEqual(result, {
        formattedAddress: "123 Sukhumvit Rd, Bangkok, Thailand",
        placeId: "place-123",
      });
    });

    test("calls the Google Geocoding API with rounded coordinates and the API key", async () => {
      await queryGoogleReverseGeocoding({ lat: 13.756331, lng: 100.501765 });

      assert.equal(mockState.fetchCalls.length, 1);

      const { input, init } = mockState.fetchCalls[0];
      const url = new URL(resolveFetchUrl(input));

      assert.equal(url.origin + url.pathname, "https://maps.googleapis.com/maps/api/geocode/json");
      assert.equal(url.searchParams.get("latlng"), "13.75633,100.50177");
      assert.equal(url.searchParams.get("key"), "test-geocode-key");
      assert.equal(init.method, "GET");
      assert.equal(init.headers.accept, "application/json");
      assert.ok(init.signal instanceof AbortSignal);
    });

    test("rounds high-precision coordinates before sending them to Google", async () => {
      await queryGoogleReverseGeocoding({
        lat: 13.7563312,
        lng: 100.5017654,
      });

      const url = new URL(resolveFetchUrl(mockState.fetchCalls[0].input));

      assert.equal(url.searchParams.get("latlng"), "13.75633,100.50177");
    });
  });

  describe("when Google returns a non-success HTTP status", () => {
    test("throws GEOCODE_UNAVAILABLE for a 500 response", async () => {
      mockState.fetchResponse = {
        ok: false,
        status: 500,
        json: async () => ({ status: "UNKNOWN_ERROR" }),
      };

      await expectAppError(
        () => queryGoogleReverseGeocoding({ lat: 13.756331, lng: 100.501765 }),
        {
          statusCode: 503,
          code: "GEOCODE_UNAVAILABLE",
          messagePart: /temporarily unavailable/,
        },
      );
    });

    test("throws GEOCODE_UNAVAILABLE for a 429 response", async () => {
      mockState.fetchResponse = {
        ok: false,
        status: 429,
        json: async () => ({ status: "OVER_QUERY_LIMIT" }),
      };

      await expectAppError(
        () => queryGoogleReverseGeocoding({ lat: 13.756331, lng: 100.501765 }),
        {
          statusCode: 503,
          code: "GEOCODE_UNAVAILABLE",
          messagePart: /temporarily unavailable/,
        },
      );
    });
  });

  describe("when Google returns a non-success payload status", () => {
    test("propagates GEOCODE_NOT_FOUND for ZERO_RESULTS", async () => {
      mockState.fetchResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          status: "ZERO_RESULTS",
          results: [],
        }),
      };

      await expectAppError(
        () => queryGoogleReverseGeocoding({ lat: 13.756331, lng: 100.501765 }),
        {
          statusCode: 404,
          code: "GEOCODE_NOT_FOUND",
          messagePart: /No address was found for the provided coordinates/,
        },
      );
    });

    test("propagates GEOCODE_REQUEST_DENIED for REQUEST_DENIED", async () => {
      mockState.fetchResponse = {
        ok: true,
        status: 200,
        json: async () => ({
          status: "REQUEST_DENIED",
          error_message:
            "This API key is not authorized to use this service or API.",
        }),
      };

      await expectAppError(
        () => queryGoogleReverseGeocoding({ lat: 13.756331, lng: 100.501765 }),
        {
          statusCode: 503,
          code: "GEOCODE_REQUEST_DENIED",
          messagePart: /denied by Google/,
        },
      );
    });

    test("propagates GEOCODE_UNAVAILABLE for OVER_QUERY_LIMIT", async () => {
      mockState.fetchResponse = {
        ok: true,
        status: 200,
        json: async () => ({ status: "OVER_QUERY_LIMIT" }),
      };

      await expectAppError(
        () => queryGoogleReverseGeocoding({ lat: 13.756331, lng: 100.501765 }),
        {
          statusCode: 503,
          code: "GEOCODE_UNAVAILABLE",
          messagePart: /temporarily unavailable/,
        },
      );
    });

    test("propagates GEOCODE_PROVIDER_ERROR for an invalid payload", async () => {
      mockState.fetchResponse = {
        ok: true,
        status: 200,
        json: async () => null,
      };

      await expectAppError(
        () => queryGoogleReverseGeocoding({ lat: 13.756331, lng: 100.501765 }),
        {
          statusCode: 502,
          code: "GEOCODE_PROVIDER_ERROR",
          messagePart: /Reverse geocoding response is invalid/,
        },
      );
    });
  });

  describe("when the Google request fails", () => {
    test("wraps network errors as GEOCODE_UNAVAILABLE", async () => {
      mockState.fetchError = new TypeError("fetch failed");

      await expectAppError(
        () => queryGoogleReverseGeocoding({ lat: 13.756331, lng: 100.501765 }),
        {
          statusCode: 503,
          code: "GEOCODE_UNAVAILABLE",
          messagePart: /temporarily unavailable/,
        },
      );
    });

    test("wraps JSON parsing errors as GEOCODE_UNAVAILABLE", async () => {
      mockState.fetchResponse = {
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("Unexpected token < in JSON");
        },
      };

      await expectAppError(
        () => queryGoogleReverseGeocoding({ lat: 13.756331, lng: 100.501765 }),
        {
          statusCode: 503,
          code: "GEOCODE_UNAVAILABLE",
          messagePart: /temporarily unavailable/,
        },
      );
    });

    test("wraps aborted requests as GEOCODE_UNAVAILABLE", async () => {
      mockState.fetchError = Object.assign(
        new Error("The operation was aborted."),
        { name: "AbortError" },
      );

      await expectAppError(
        () => queryGoogleReverseGeocoding({ lat: 13.756331, lng: 100.501765 }),
        {
          statusCode: 503,
          code: "GEOCODE_UNAVAILABLE",
          messagePart: /temporarily unavailable/,
        },
      );
    });
  });
});
