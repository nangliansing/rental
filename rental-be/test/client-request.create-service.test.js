import assert from "node:assert/strict";
import { afterEach, describe, mock, test } from "node:test";

import mongoose from "mongoose";

import { AppError } from "../shared/errors/app-error.js";
import {
  CLIENT_REQUEST_STATUSES,
  GEO_SEARCH_MODES,
} from "../modules/client-request/client-request.constants.js";

const mockState = {
  createCalls: [],
  createError: null,
  createdDocuments: null,
};

mock.module("../modules/client-request/client-request.model.js", {
  defaultExport: {
    create: async (docs, options) => {
      mockState.createCalls.push({
        docs,
        options,
      });

      if (mockState.createError) {
        throw mockState.createError;
      }

      if (mockState.createdDocuments) {
        return mockState.createdDocuments;
      }

      return docs.map((doc) => ({
        ...doc,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date("2026-08-03T18:00:00.000Z"),
        updatedAt: new Date("2026-08-03T18:00:00.000Z"),
      }));
    },
  },
});

const { createClientRequestService } = await import(
  "../modules/client-request/services/create-client-request.service.js"
);

const actorId = new mongoose.Types.ObjectId().toString();
const agentProfileId = new mongoose.Types.ObjectId().toString();

const validBounds = {
  northEast: { lat: 13.78, lng: 100.66 },
  southWest: { lat: 13.75, lng: 100.62 },
};

const validPosition = { lat: 13.73, lng: 100.54 };

const validLineGeometry = {
  type: "LineString",
  coordinates: [
    [100.6, 13.7],
    [100.7, 13.8],
  ],
};

const areaBody = {
  name: "  Sukhumvit 2BR  ",
  description: "Near BTS",
  geoSearch: {
    mode: GEO_SEARCH_MODES.AREA,
    bounds: validBounds,
    placeName: "Phrom Phong",
  },
  filters: {
    minRent: 15_000,
    maxRent: 35_000,
    isForeignerAccepted: true,
    agentProfileIds: [agentProfileId],
  },
};

const assertValidationError = (error, messageMatcher = null) => {
  assert.equal(error instanceof AppError, true);
  assert.equal(error.statusCode, 422);
  assert.equal(error.code, "VALIDATION_ERROR");
  if (typeof messageMatcher === "string") {
    assert.equal(error.message, messageMatcher);
  } else if (messageMatcher) {
    assert.match(error.message, messageMatcher);
  }
};

const resetMockState = () => {
  mockState.createCalls = [];
  mockState.createError = null;
  mockState.createdDocuments = null;
};

afterEach(() => {
  resetMockState();
});

describe("createClientRequestService", () => {
  test("validates input, persists one record without a session, and returns it", async () => {
    const created = await createClientRequestService(areaBody, actorId, null);

    assert.equal(mockState.createCalls.length, 1);

    const [{ docs, options }] = mockState.createCalls;
    assert.equal(options, undefined);
    assert.equal(docs.length, 1);

    const [record] = docs;
    assert.equal(String(record.createdBy), actorId);
    assert.equal(record.name, "Sukhumvit 2BR");
    assert.equal(record.description, "Near BTS");
    assert.deepEqual(record.geoSearch, {
      mode: GEO_SEARCH_MODES.AREA,
      bounds: validBounds,
      placeName: "Phrom Phong",
    });
    assert.equal(record.filters.minRent, 15_000);
    assert.equal(record.filters.maxRent, 35_000);
    assert.equal(record.filters.isForeignerAccepted, true);
    assert.equal(String(record.filters.agentProfileIds[0]), agentProfileId);
    assert.equal(record.status, CLIENT_REQUEST_STATUSES.WAITING);
    assert.equal(record.isDeleted, false);
    assert.equal(record.deletedAt, null);

    assert.equal(String(created.createdBy), actorId);
    assert.equal(created.name, "Sukhumvit 2BR");
    assert.equal(created._id instanceof mongoose.Types.ObjectId, true);
    assert.equal(created.status, CLIENT_REQUEST_STATUSES.WAITING);
    assert.equal(created.isDeleted, false);
    assert.equal(created.deletedAt, null);
  });

  test("defaults session to null when omitted", async () => {
    await createClientRequestService(areaBody, actorId);

    assert.equal(mockState.createCalls.length, 1);
    assert.equal(mockState.createCalls[0].options, undefined);
  });

  test("passes a valid session through to ClientRequest.create", async () => {
    const session = { id: "fake-mongoose-session" };

    await createClientRequestService(areaBody, actorId, session);

    assert.equal(mockState.createCalls.length, 1);
    assert.deepEqual(mockState.createCalls[0].options, { session });
  });

  test("rejects an invalid session before building or persisting", async () => {
    await assert.rejects(
      () => createClientRequestService(areaBody, actorId, "not-a-session"),
      (error) => {
        assertValidationError(error, "session must be an object");
        return true;
      },
    );

    assert.equal(mockState.createCalls.length, 0);
  });

  test("rejects invalid bodies before persisting", async () => {
    await assert.rejects(
      () => createClientRequestService({ name: "Missing geo" }, actorId, null),
      (error) => {
        assertValidationError(error, "geoSearch is required");
        return true;
      },
    );

    await assert.rejects(
      () =>
        createClientRequestService(
          {
            name: "Bad filters",
            geoSearch: {
              mode: GEO_SEARCH_MODES.NEARBY,
              position: validPosition,
              radiusMeters: 500,
            },
            filters: { minRent: 5000, maxRent: 1000 },
          },
          actorId,
          null,
        ),
      (error) => {
        assertValidationError(
          error,
          "maxRent must be greater than or equal to minRent",
        );
        return true;
      },
    );

    assert.equal(mockState.createCalls.length, 0);
  });

  test("rejects invalid actorId before persisting", async () => {
    await assert.rejects(
      () => createClientRequestService(areaBody, "bad-actor-id", null),
      (error) => {
        assertValidationError(error);
        return true;
      },
    );

    assert.equal(mockState.createCalls.length, 0);
  });

  test("persists nearby and line mode records", async () => {
    const nearby = await createClientRequestService(
      {
        name: "Pin search",
        geoSearch: {
          mode: GEO_SEARCH_MODES.NEARBY,
          position: validPosition,
          radiusMeters: 500,
        },
      },
      actorId,
      null,
    );

    assert.equal(nearby.geoSearch.mode, GEO_SEARCH_MODES.NEARBY);
    assert.deepEqual(nearby.geoSearch.position, validPosition);
    assert.equal(nearby.geoSearch.radiusMeters, 500);

    const line = await createClientRequestService(
      {
        name: "Line search",
        geoSearch: {
          mode: GEO_SEARCH_MODES.LINE,
          geometry: validLineGeometry,
          distanceMeters: 750,
        },
        filters: {},
      },
      actorId,
      null,
    );

    assert.equal(line.geoSearch.mode, GEO_SEARCH_MODES.LINE);
    assert.deepEqual(line.geoSearch.geometry, validLineGeometry);
    assert.equal(line.geoSearch.distanceMeters, 750);
    assert.equal(mockState.createCalls.length, 2);
  });

  test("returns the document produced by ClientRequest.create", async () => {
    const persisted = {
      _id: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(actorId),
      name: "Persisted request",
      description: null,
      geoSearch: {
        mode: GEO_SEARCH_MODES.AREA,
        bounds: validBounds,
        placeName: null,
      },
      filters: {},
      isDeleted: false,
      deletedAt: null,
    };
    mockState.createdDocuments = [persisted];

    const result = await createClientRequestService(areaBody, actorId, null);

    assert.equal(result, persisted);
  });

  test("propagates persistence failures from ClientRequest.create", async () => {
    mockState.createError = new Error("write failed");

    await assert.rejects(
      () => createClientRequestService(areaBody, actorId, null),
      (error) => {
        assert.equal(error.message, "write failed");
        return true;
      },
    );

    assert.equal(mockState.createCalls.length, 1);
  });
});
