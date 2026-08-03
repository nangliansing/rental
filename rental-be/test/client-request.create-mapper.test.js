import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";

import { AppError } from "../shared/errors/app-error.js";
import {
  CLIENT_REQUEST_STATUSES,
  GEO_SEARCH_MODES,
} from "../modules/client-request/client-request.constants.js";
import { buildCreateClientRequestRecord } from "../modules/client-request/mappers/build-create-client-request-record.js";

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

const baseAreaBody = {
  name: "Sukhumvit 2BR",
  geoSearch: {
    mode: GEO_SEARCH_MODES.AREA,
    bounds: validBounds,
  },
};

const assertValidationError = (fn, messageMatcher = null) => {
  assert.throws(fn, (error) => {
    if (!(error instanceof AppError)) return false;
    if (error.statusCode !== 422) return false;
    if (error.code !== "VALIDATION_ERROR") return false;
    if (messageMatcher == null) return true;
    if (typeof messageMatcher === "string") {
      return error.message === messageMatcher;
    }
    return messageMatcher.test(error.message);
  });
};

test("buildCreateClientRequestRecord builds a persistable area record", () => {
  const record = buildCreateClientRequestRecord(
    {
      name: "  Client condo request  ",
      description: "  Near BTS  ",
      geoSearch: {
        mode: "area",
        bounds: validBounds,
        placeName: "  Phrom Phong  ",
        position: validPosition,
        radiusMeters: 500,
      },
      filters: {
        minRent: 15_000,
        maxRent: 35_000,
        isForeignerAccepted: true,
        agentProfileIds: [agentProfileId],
      },
    },
    actorId,
  );

  assert.equal(record.createdBy instanceof mongoose.Types.ObjectId, true);
  assert.equal(String(record.createdBy), actorId);
  assert.equal(record.name, "Client condo request");
  assert.equal(record.description, "Near BTS");
  assert.deepEqual(record.geoSearch, {
    mode: GEO_SEARCH_MODES.AREA,
    bounds: validBounds,
    placeName: "Phrom Phong",
  });
  assert.equal(record.filters.minRent, 15_000);
  assert.equal(record.filters.maxRent, 35_000);
  assert.equal(record.filters.isForeignerAccepted, true);
  assert.equal(record.filters.agentProfileIds.length, 1);
  assert.equal(String(record.filters.agentProfileIds[0]), agentProfileId);
  assert.equal(record.status, CLIENT_REQUEST_STATUSES.WAITING);
  assert.equal(record.isDeleted, false);
  assert.equal(record.deletedAt, null);
  assert.equal(record.geoSearch.position, undefined);
  assert.equal(record.geoSearch.radiusMeters, undefined);
});

test("buildCreateClientRequestRecord builds nearby and line records", () => {
  const nearby = buildCreateClientRequestRecord(
    {
      name: "Pin search",
      geoSearch: {
        mode: GEO_SEARCH_MODES.NEARBY,
        position: validPosition,
        radiusMeters: 500,
      },
    },
    actorId,
  );

  assert.equal(String(nearby.createdBy), actorId);
  assert.equal(nearby.description, null);
  assert.deepEqual(nearby.filters, {});
  assert.deepEqual(nearby.geoSearch, {
    mode: GEO_SEARCH_MODES.NEARBY,
    position: validPosition,
    radiusMeters: 500,
    placeName: null,
  });
  assert.equal(nearby.status, CLIENT_REQUEST_STATUSES.WAITING);
  assert.equal(nearby.isDeleted, false);
  assert.equal(nearby.deletedAt, null);

  const line = buildCreateClientRequestRecord(
    {
      name: "Line search",
      description: null,
      geoSearch: {
        mode: GEO_SEARCH_MODES.LINE,
        geometry: validLineGeometry,
        distanceMeters: 750,
      },
      filters: {},
    },
    actorId,
  );

  assert.deepEqual(line.geoSearch, {
    mode: GEO_SEARCH_MODES.LINE,
    geometry: validLineGeometry,
    distanceMeters: 750,
    placeName: null,
  });
  assert.deepEqual(line.filters, {});
  assert.equal(line.description, null);
});

test("buildCreateClientRequestRecord accepts ObjectId actorId instances", () => {
  const objectId = new mongoose.Types.ObjectId();
  const record = buildCreateClientRequestRecord(baseAreaBody, objectId);

  assert.equal(record.createdBy instanceof mongoose.Types.ObjectId, true);
  assert.equal(String(record.createdBy), String(objectId));
});

test("buildCreateClientRequestRecord always sets Waiting status and soft-delete defaults", () => {
  const record = buildCreateClientRequestRecord(
    {
      ...baseAreaBody,
      status: CLIENT_REQUEST_STATUSES.CLOSED,
      isDeleted: true,
      deletedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
    actorId,
  );

  assert.equal(record.status, CLIENT_REQUEST_STATUSES.WAITING);
  assert.equal(record.isDeleted, false);
  assert.equal(record.deletedAt, null);
  assert.equal("status" in record, true);
  assert.equal("isDeleted" in record, true);
  assert.equal("deletedAt" in record, true);
});

test("buildCreateClientRequestRecord does not leak request metadata fields", () => {
  const record = buildCreateClientRequestRecord(
    {
      ...baseAreaBody,
      createdBy: new mongoose.Types.ObjectId().toString(),
      _id: new mongoose.Types.ObjectId().toString(),
      createdAt: new Date("2020-01-01T00:00:00.000Z"),
      updatedAt: new Date("2020-01-02T00:00:00.000Z"),
      unexpected: "value",
    },
    actorId,
  );

  assert.equal(String(record.createdBy), actorId);
  assert.equal(record._id, undefined);
  assert.equal(record.createdAt, undefined);
  assert.equal(record.updatedAt, undefined);
  assert.equal(record.unexpected, undefined);
  assert.deepEqual(Object.keys(record).sort(), [
    "createdBy",
    "deletedAt",
    "description",
    "filters",
    "geoSearch",
    "isDeleted",
    "name",
    "status",
  ]);
});

test("buildCreateClientRequestRecord rejects invalid actorId values", () => {
  for (const invalidActorId of [
    null,
    undefined,
    "",
    "   ",
    "not-an-id",
    123,
    {},
    [],
  ]) {
    assertValidationError(() =>
      buildCreateClientRequestRecord(baseAreaBody, invalidActorId),
    );
  }
});

test("buildCreateClientRequestRecord rejects invalid bodies before building", () => {
  assertValidationError(
    () => buildCreateClientRequestRecord(null, actorId),
    "body must be an object",
  );

  assertValidationError(
    () => buildCreateClientRequestRecord({ name: "Missing geo" }, actorId),
    "geoSearch is required",
  );

  assertValidationError(() =>
    buildCreateClientRequestRecord(
      {
        name: "Bad nearby",
        geoSearch: {
          mode: "nearby",
          position: validPosition,
        },
      },
      actorId,
    ),
  );

  assertValidationError(
    () =>
      buildCreateClientRequestRecord(
        {
          ...baseAreaBody,
          filters: { minRent: 5000, maxRent: 1000 },
        },
        actorId,
      ),
    "maxRent must be greater than or equal to minRent",
  );
});

test("buildCreateClientRequestRecord validates body before actorId", () => {
  assertValidationError(
    () => buildCreateClientRequestRecord({ name: "Missing geo" }, "bad-actor"),
    "geoSearch is required",
  );
});
