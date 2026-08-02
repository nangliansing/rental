import assert from "node:assert/strict";
import { beforeEach, describe, mock, test } from "node:test";

import { AppError } from "../../../shared/errors/app-error.js";
import { GEOCODE_SOURCE } from "../geocode.constants.js";

const validBody = {
  lat: 13.756331,
  lng: 100.501765,
};

const mockState = {
  serviceCalls: [],
  serviceResult: {
    lat: 13.75633,
    lng: 100.50177,
    formattedAddress: "123 Sukhumvit Rd, Bangkok, Thailand",
    placeId: "place-123",
    source: GEOCODE_SOURCE.GOOGLE,
    cached: false,
    fetchedAt: "2026-08-02T05:00:00.000Z",
  },
  serviceError: null,
};

mock.module("../services/reverse-geocode.service.js", {
  namedExports: {
    reverseGeocodeService: async ({ bodyInput, session = null }) => {
      mockState.serviceCalls.push({ bodyInput, session });

      if (mockState.serviceError) {
        throw mockState.serviceError;
      }

      return mockState.serviceResult;
    },
  },
});

const { reverseGeocodeController } = await import(
  "./reverse-geocode.controller.js"
);

const resetMockState = () => {
  mockState.serviceCalls = [];
  mockState.serviceError = null;
  mockState.serviceResult = {
    lat: 13.75633,
    lng: 100.50177,
    formattedAddress: "123 Sukhumvit Rd, Bangkok, Thailand",
    placeId: "place-123",
    source: GEOCODE_SOURCE.GOOGLE,
    cached: false,
    fetchedAt: "2026-08-02T05:00:00.000Z",
  };
};

const createMockResponse = () => {
  const response = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };

  return response;
};

const createMockNext = () => {
  const calls = [];
  const next = (error) => {
    calls.push(error);
  };

  next.calls = calls;
  return next;
};

describe("reverseGeocodeController", () => {
  beforeEach(() => {
    resetMockState();
  });

  describe("when reverse geocoding succeeds", () => {
    test("returns a 200 response with success and data", async () => {
      const req = { body: validBody, dbSession: null };
      const res = createMockResponse();
      const next = createMockNext();

      await reverseGeocodeController(req, res, next);

      assert.equal(next.calls.length, 0);
      assert.equal(res.statusCode, 200);
      assert.deepEqual(res.body, {
        success: true,
        data: mockState.serviceResult,
      });
    });

    test("delegates req.body and req.dbSession to reverseGeocodeService", async () => {
      const session = { id: "session-1" };
      const req = { body: validBody, dbSession: session };
      const res = createMockResponse();
      const next = createMockNext();

      await reverseGeocodeController(req, res, next);

      assert.equal(mockState.serviceCalls.length, 1);
      assert.deepEqual(mockState.serviceCalls[0], {
        bodyInput: validBody,
        session,
      });
    });

    test("forwards cached results unchanged", async () => {
      mockState.serviceResult = {
        ...mockState.serviceResult,
        cached: true,
        formattedAddress: "Cached address",
      };

      const req = { body: validBody, dbSession: null };
      const res = createMockResponse();
      const next = createMockNext();

      await reverseGeocodeController(req, res, next);

      assert.equal(res.body.data.cached, true);
      assert.equal(res.body.data.formattedAddress, "Cached address");
    });
  });

  describe("when reverseGeocodeService rejects", () => {
    test("forwards validation errors to next", async () => {
      const validationError = new AppError("lat is required", 422, "VALIDATION_ERROR");
      mockState.serviceError = validationError;

      const req = { body: { lng: 100.501765 }, dbSession: null };
      const res = createMockResponse();
      const next = createMockNext();

      await reverseGeocodeController(req, res, next);

      assert.equal(next.calls.length, 1);
      assert.equal(next.calls[0], validationError);
      assert.equal(res.statusCode, null);
      assert.equal(res.body, null);
    });

    test("forwards GEOCODE_NOT_FOUND errors to next", async () => {
      const notFoundError = new AppError(
        "No address was found for the provided coordinates",
        404,
        "GEOCODE_NOT_FOUND",
      );
      mockState.serviceError = notFoundError;

      const req = { body: validBody, dbSession: null };
      const res = createMockResponse();
      const next = createMockNext();

      await reverseGeocodeController(req, res, next);

      assert.equal(next.calls.length, 1);
      assert.equal(next.calls[0], notFoundError);
    });

    test("forwards GEOCODE_UNAVAILABLE errors to next", async () => {
      const unavailableError = new AppError(
        "Reverse geocoding is temporarily unavailable",
        503,
        "GEOCODE_UNAVAILABLE",
      );
      mockState.serviceError = unavailableError;

      const req = { body: validBody, dbSession: null };
      const res = createMockResponse();
      const next = createMockNext();

      await reverseGeocodeController(req, res, next);

      assert.equal(next.calls.length, 1);
      assert.equal(next.calls[0], unavailableError);
    });

    test("forwards unexpected errors to next", async () => {
      const unexpectedError = new Error("database connection failed");
      mockState.serviceError = unexpectedError;

      const req = { body: validBody, dbSession: null };
      const res = createMockResponse();
      const next = createMockNext();

      await reverseGeocodeController(req, res, next);

      assert.equal(next.calls.length, 1);
      assert.equal(next.calls[0], unexpectedError);
    });
  });
});
