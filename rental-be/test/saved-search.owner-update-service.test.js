import assert from "node:assert/strict";
import { afterEach, describe, mock, test } from "node:test";

import mongoose from "mongoose";

import { AppError } from "../shared/errors/app-error.js";
import {
  SAVED_SEARCH_STATUSES,
  GEO_SEARCH_MODES,
} from "../modules/saved-search/saved-search.constants.js";

const actorId = new mongoose.Types.ObjectId();
const otherActorId = new mongoose.Types.ObjectId();
const savedSearchId = new mongoose.Types.ObjectId();

const validBounds = {
  northEast: { lat: 13.78, lng: 100.66 },
  southWest: { lat: 13.75, lng: 100.62 },
};

const existingDocument = {
  _id: savedSearchId,
  createdBy: actorId,
  name: "Sukhumvit 2BR",
  description: "Near BTS",
  status: SAVED_SEARCH_STATUSES.WAITING,
  geoSearch: {
    mode: GEO_SEARCH_MODES.AREA,
    bounds: validBounds,
    placeName: "Phrom Phong",
  },
  filters: {
    minRent: 15_000,
    maxRent: 35_000,
  },
  isDeleted: false,
  deletedAt: null,
};

const mockState = {
  findOneResults: [],
  findOneCalls: [],
  findOneAndUpdateResult: null,
  findOneAndUpdateCalls: [],
};

const createChain = (result) => {
  const query = {
    session(session) {
      query.usedSession = session;
      return query;
    },
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };

  return query;
};

mock.module("../modules/saved-search/saved-search.model.js", {
  defaultExport: {
    findOne: (filter) => {
      mockState.findOneCalls.push({ filter });
      const result = mockState.findOneResults.shift();
      return createChain(result === undefined ? null : result);
    },
    findOneAndUpdate: (filter, update, options) => {
      mockState.findOneAndUpdateCalls.push({ filter, update, options });
      return createChain(mockState.findOneAndUpdateResult);
    },
  },
});

const { ownerUpdateSavedSearchService } = await import(
  "../modules/saved-search/services/owner-update-saved-search.service.js"
);

const resetMockState = () => {
  mockState.findOneResults = [];
  mockState.findOneCalls = [];
  mockState.findOneAndUpdateResult = null;
  mockState.findOneAndUpdateCalls = [];
};

afterEach(() => {
  resetMockState();
});

describe("ownerUpdateSavedSearchService", () => {
  test("loads owned waiting request, updates changed fields, and returns the updated doc", async () => {
    const updatedDocument = {
      ...existingDocument,
      name: "Updated name",
    };

    mockState.findOneResults = [existingDocument];
    mockState.findOneAndUpdateResult = updatedDocument;

    const result = await ownerUpdateSavedSearchService({
      savedSearchId: savedSearchId.toString(),
      actorId: actorId.toString(),
      body: { name: "  Updated name  " },
      session: null,
    });

    assert.equal(mockState.findOneCalls.length, 1);
    assert.deepEqual(mockState.findOneCalls[0].filter, {
      _id: savedSearchId.toString(),
      createdBy: actorId.toString(),
      isDeleted: false,
    });

    assert.equal(mockState.findOneAndUpdateCalls.length, 1);
    const [{ filter, update, options }] = mockState.findOneAndUpdateCalls;
    assert.deepEqual(filter, {
      _id: savedSearchId.toString(),
      createdBy: actorId.toString(),
      isDeleted: false,
      status: SAVED_SEARCH_STATUSES.WAITING,
    });
    assert.deepEqual(update, { $set: { name: "Updated name" } });
    assert.deepEqual(options, {
      returnDocument: "after",
      runValidators: true,
    });
    assert.equal(result, updatedDocument);
  });

  test("passes a valid session through to find and update queries", async () => {
    const session = { id: "fake-mongoose-session" };
    mockState.findOneResults = [existingDocument];
    mockState.findOneAndUpdateResult = {
      ...existingDocument,
      name: "With session",
    };

    await ownerUpdateSavedSearchService({
      savedSearchId: savedSearchId.toString(),
      actorId: actorId.toString(),
      body: { name: "With session" },
      session,
    });

    assert.equal(mockState.findOneAndUpdateCalls.length, 1);
  });

  test("rejects an invalid session before querying", async () => {
    await assert.rejects(
      () =>
        ownerUpdateSavedSearchService({
          savedSearchId: savedSearchId.toString(),
          actorId: actorId.toString(),
          body: { name: "Nope" },
          session: "bad",
        }),
      (error) => {
        assert.equal(error instanceof AppError, true);
        assert.equal(error.statusCode, 422);
        assert.equal(error.code, "VALIDATION_ERROR");
        return true;
      },
    );

    assert.equal(mockState.findOneCalls.length, 0);
    assert.equal(mockState.findOneAndUpdateCalls.length, 0);
  });

  test("returns 404 when the saved search is missing or not owned", async () => {
    mockState.findOneResults = [null];

    await assert.rejects(
      () =>
        ownerUpdateSavedSearchService({
          savedSearchId: savedSearchId.toString(),
          actorId: otherActorId.toString(),
          body: { name: "Nope" },
        }),
      (error) => {
        assert.equal(error instanceof AppError, true);
        assert.equal(error.statusCode, 404);
        assert.equal(error.code, "SAVED_SEARCH_NOT_FOUND");
        return true;
      },
    );

    assert.equal(mockState.findOneAndUpdateCalls.length, 0);
  });

  test("returns 409 when the saved search is closed", async () => {
    mockState.findOneResults = [
      {
        ...existingDocument,
        status: SAVED_SEARCH_STATUSES.CLOSED,
      },
    ];

    await assert.rejects(
      () =>
        ownerUpdateSavedSearchService({
          savedSearchId: savedSearchId.toString(),
          actorId: actorId.toString(),
          body: { name: "Nope" },
        }),
      (error) => {
        assert.equal(error instanceof AppError, true);
        assert.equal(error.statusCode, 409);
        assert.equal(error.code, "SAVED_SEARCH_CLOSED");
        return true;
      },
    );

    assert.equal(mockState.findOneAndUpdateCalls.length, 0);
  });

  test("returns 422 NO_VALID_CHANGE when values are unchanged", async () => {
    mockState.findOneResults = [existingDocument];

    await assert.rejects(
      () =>
        ownerUpdateSavedSearchService({
          savedSearchId: savedSearchId.toString(),
          actorId: actorId.toString(),
          body: { name: "Sukhumvit 2BR" },
        }),
      (error) => {
        assert.equal(error instanceof AppError, true);
        assert.equal(error.statusCode, 422);
        assert.equal(error.code, "NO_VALID_CHANGE");
        return true;
      },
    );

    assert.equal(mockState.findOneAndUpdateCalls.length, 0);
  });

  test("returns 409 when a concurrent close wins the update race", async () => {
    mockState.findOneResults = [
      existingDocument,
      {
        ...existingDocument,
        status: SAVED_SEARCH_STATUSES.CLOSED,
      },
    ];
    mockState.findOneAndUpdateResult = null;

    await assert.rejects(
      () =>
        ownerUpdateSavedSearchService({
          savedSearchId: savedSearchId.toString(),
          actorId: actorId.toString(),
          body: { name: "Race update" },
        }),
      (error) => {
        assert.equal(error instanceof AppError, true);
        assert.equal(error.statusCode, 409);
        assert.equal(error.code, "SAVED_SEARCH_CLOSED");
        return true;
      },
    );

    assert.equal(mockState.findOneAndUpdateCalls.length, 1);
    assert.equal(mockState.findOneCalls.length, 2);
  });
});
