import assert from "node:assert/strict";
import { afterEach, describe, mock, test } from "node:test";

import mongoose from "mongoose";

import { AppError } from "../shared/errors/app-error.js";
import {
  CLIENT_REQUEST_STATUSES,
  GEO_SEARCH_MODES,
} from "../modules/client-request/client-request.constants.js";
import { buildOwnerClientRequestFilter } from "../modules/client-request/utils/build-owner-client-request-filter.js";
import { throwClientRequestNotFound } from "../modules/client-request/utils/throw-client-request-not-found.js";

const actorId = new mongoose.Types.ObjectId();
const otherActorId = new mongoose.Types.ObjectId();
const clientRequestId = new mongoose.Types.ObjectId();

const existingDocument = {
  _id: clientRequestId,
  createdBy: actorId,
  name: "Sukhumvit 2BR",
  description: "Near BTS",
  status: CLIENT_REQUEST_STATUSES.WAITING,
  geoSearch: {
    mode: GEO_SEARCH_MODES.AREA,
    bounds: {
      northEast: { lat: 13.78, lng: 100.66 },
      southWest: { lat: 13.75, lng: 100.62 },
    },
    placeName: "Phrom Phong",
  },
  filters: {
    minRent: 15_000,
    maxRent: 35_000,
    availableBy: new Date("2026-09-01T17:00:00.000Z"),
  },
  isDeleted: false,
  deletedAt: null,
  createdAt: new Date("2026-08-03T18:00:00.000Z"),
  updatedAt: new Date("2026-08-03T18:00:00.000Z"),
};

const mockState = {
  findOneResult: null,
  findOneError: null,
  findOneCalls: [],
};

const createChain = (result) => {
  const query = {
    usedSession: undefined,
    session(session) {
      query.usedSession = session;
      return query;
    },
    then(resolve, reject) {
      if (mockState.findOneError) {
        return Promise.reject(mockState.findOneError).then(resolve, reject);
      }

      return Promise.resolve(result).then(resolve, reject);
    },
  };

  return query;
};

mock.module("../modules/client-request/client-request.model.js", {
  defaultExport: {
    findOne: (filter) => {
      const query = createChain(mockState.findOneResult);
      mockState.findOneCalls.push({ filter, query });
      return query;
    },
  },
});

const { ownerSearchClientRequestByIdService } = await import(
  "../modules/client-request/services/owner-search-client-request-by-id.service.js"
);

const resetMockState = () => {
  mockState.findOneResult = null;
  mockState.findOneError = null;
  mockState.findOneCalls = [];
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
  return true;
};

const assertNotFoundError = (error) => {
  assert.equal(error instanceof AppError, true);
  assert.equal(error.statusCode, 404);
  assert.equal(error.code, "CLIENT_REQUEST_NOT_FOUND");
  assert.equal(error.message, "Client request not found");
  return true;
};

afterEach(() => {
  resetMockState();
});

describe("buildOwnerClientRequestFilter", () => {
  test("builds ownership + soft-delete filter from strings", () => {
    assert.deepEqual(
      buildOwnerClientRequestFilter({
        clientRequestId: clientRequestId.toString(),
        actorId: actorId.toString(),
      }),
      {
        _id: clientRequestId.toString(),
        createdBy: actorId.toString(),
        isDeleted: false,
      },
    );
  });

  test("preserves ObjectId inputs as provided", () => {
    assert.deepEqual(
      buildOwnerClientRequestFilter({
        clientRequestId,
        actorId,
      }),
      {
        _id: clientRequestId,
        createdBy: actorId,
        isDeleted: false,
      },
    );
  });

  test("never includes status or deletedAt in the filter", () => {
    const filter = buildOwnerClientRequestFilter({
      clientRequestId,
      actorId,
    });

    assert.deepEqual(Object.keys(filter).sort(), [
      "_id",
      "createdBy",
      "isDeleted",
    ]);
    assert.equal(filter.isDeleted, false);
  });
});

describe("throwClientRequestNotFound", () => {
  test("throws a stable 404 AppError", () => {
    assert.throws(() => throwClientRequestNotFound(), assertNotFoundError);
  });
});

describe("ownerSearchClientRequestByIdService", () => {
  describe("successful fetch", () => {
    test("returns an owned non-deleted Waiting request unchanged", async () => {
      mockState.findOneResult = existingDocument;

      const result = await ownerSearchClientRequestByIdService({
        clientRequestId: clientRequestId.toString(),
        actorId: actorId.toString(),
        session: null,
      });

      assert.equal(mockState.findOneCalls.length, 1);
      assert.deepEqual(mockState.findOneCalls[0].filter, {
        _id: clientRequestId.toString(),
        createdBy: actorId.toString(),
        isDeleted: false,
      });
      assert.equal(mockState.findOneCalls[0].query.usedSession, undefined);
      assert.equal(result, existingDocument);
      assert.equal(result.name, "Sukhumvit 2BR");
      assert.equal(result.status, CLIENT_REQUEST_STATUSES.WAITING);
      assert.equal(result.filters.minRent, 15_000);
    });

    test("returns an owned Closed request without filtering by status", async () => {
      const closedDocument = {
        ...existingDocument,
        status: CLIENT_REQUEST_STATUSES.CLOSED,
      };
      mockState.findOneResult = closedDocument;

      const result = await ownerSearchClientRequestByIdService({
        clientRequestId: clientRequestId.toString(),
        actorId: actorId.toString(),
      });

      assert.equal(result, closedDocument);
      assert.equal(result.status, CLIENT_REQUEST_STATUSES.CLOSED);
      assert.equal(
        Object.hasOwn(mockState.findOneCalls[0].filter, "status"),
        false,
      );
    });

    test("accepts ObjectId inputs for clientRequestId and actorId", async () => {
      mockState.findOneResult = existingDocument;

      await ownerSearchClientRequestByIdService({
        clientRequestId,
        actorId,
      });

      assert.deepEqual(mockState.findOneCalls[0].filter, {
        _id: clientRequestId.toString(),
        createdBy: actorId.toString(),
        isDeleted: false,
      });
    });

    test("defaults session to null when omitted", async () => {
      mockState.findOneResult = existingDocument;

      await ownerSearchClientRequestByIdService({
        clientRequestId: clientRequestId.toString(),
        actorId: actorId.toString(),
      });

      assert.equal(mockState.findOneCalls[0].query.usedSession, undefined);
    });

    test("does not attach session when session is explicitly null", async () => {
      mockState.findOneResult = existingDocument;

      await ownerSearchClientRequestByIdService({
        clientRequestId: clientRequestId.toString(),
        actorId: actorId.toString(),
        session: null,
      });

      assert.equal(mockState.findOneCalls[0].query.usedSession, undefined);
    });

    test("attaches a valid session to the query", async () => {
      const session = { id: "fake-mongoose-session" };
      mockState.findOneResult = existingDocument;

      await ownerSearchClientRequestByIdService({
        clientRequestId: clientRequestId.toString(),
        actorId: actorId.toString(),
        session,
      });

      assert.equal(mockState.findOneCalls[0].query.usedSession, session);
    });

    test("returns the exact document instance from findOne", async () => {
      const document = {
        ...existingDocument,
        name: "Exact instance",
      };
      mockState.findOneResult = document;

      const result = await ownerSearchClientRequestByIdService({
        clientRequestId: clientRequestId.toString(),
        actorId: actorId.toString(),
      });

      assert.equal(result === document, true);
    });
  });

  describe("input validation", () => {
    for (const [label, value] of [
      ["null", null],
      ["undefined", undefined],
      ["empty string", ""],
      ["whitespace", "   "],
      ["non-hex string", "not-an-object-id"],
      ["too short hex", "abc123"],
      ["too long hex", `${clientRequestId.toString()}a`],
      ["invalid 24-char hex", "zzzzzzzzzzzzzzzzzzzzzzzz"],
      ["number", 123],
      ["boolean", false],
      ["object", {}],
      ["array", []],
    ]) {
      test(`rejects invalid clientRequestId: ${label}`, async () => {
        await assert.rejects(
          () =>
            ownerSearchClientRequestByIdService({
              clientRequestId: value,
              actorId: actorId.toString(),
            }),
          (error) => assertValidationError(error, /clientRequestId/),
        );

        assert.equal(mockState.findOneCalls.length, 0);
      });

      test(`rejects invalid actorId: ${label}`, async () => {
        await assert.rejects(
          () =>
            ownerSearchClientRequestByIdService({
              clientRequestId: clientRequestId.toString(),
              actorId: value,
            }),
          (error) => assertValidationError(error, /actorId/),
        );

        assert.equal(mockState.findOneCalls.length, 0);
      });
    }

    for (const [label, value] of [
      ["string", "bad-session"],
      ["number", 1],
      ["array", []],
      ["true", true],
      ["false", false],
    ]) {
      test(`rejects invalid session: ${label}`, async () => {
        await assert.rejects(
          () =>
            ownerSearchClientRequestByIdService({
              clientRequestId: clientRequestId.toString(),
              actorId: actorId.toString(),
              session: value,
            }),
          (error) => assertValidationError(error, "session must be an object"),
        );

        assert.equal(mockState.findOneCalls.length, 0);
      });
    }

    test("validates session before ids when session is invalid", async () => {
      await assert.rejects(
        () =>
          ownerSearchClientRequestByIdService({
            clientRequestId: "bad-id",
            actorId: "bad-id",
            session: "bad-session",
          }),
        (error) => assertValidationError(error, "session must be an object"),
      );

      assert.equal(mockState.findOneCalls.length, 0);
    });

    test("rejects missing clientRequestId before querying", async () => {
      await assert.rejects(
        () =>
          ownerSearchClientRequestByIdService({
            actorId: actorId.toString(),
          }),
        (error) => assertValidationError(error, /clientRequestId/),
      );

      assert.equal(mockState.findOneCalls.length, 0);
    });

    test("rejects missing actorId before querying", async () => {
      await assert.rejects(
        () =>
          ownerSearchClientRequestByIdService({
            clientRequestId: clientRequestId.toString(),
          }),
        (error) => assertValidationError(error, /actorId/),
      );

      assert.equal(mockState.findOneCalls.length, 0);
    });
  });

  describe("not found / ownership / soft-delete", () => {
    test("returns 404 when findOne matches nothing", async () => {
      mockState.findOneResult = null;

      await assert.rejects(
        () =>
          ownerSearchClientRequestByIdService({
            clientRequestId: clientRequestId.toString(),
            actorId: actorId.toString(),
          }),
        assertNotFoundError,
      );

      assert.equal(mockState.findOneCalls.length, 1);
    });

    test("uses the caller actorId in the ownership filter", async () => {
      mockState.findOneResult = null;

      await assert.rejects(
        () =>
          ownerSearchClientRequestByIdService({
            clientRequestId: clientRequestId.toString(),
            actorId: otherActorId.toString(),
          }),
        assertNotFoundError,
      );

      assert.deepEqual(mockState.findOneCalls[0].filter, {
        _id: clientRequestId.toString(),
        createdBy: otherActorId.toString(),
        isDeleted: false,
      });
    });

    test("always requires isDeleted false so soft-deleted rows 404", async () => {
      mockState.findOneResult = null;

      await assert.rejects(
        () =>
          ownerSearchClientRequestByIdService({
            clientRequestId: clientRequestId.toString(),
            actorId: actorId.toString(),
          }),
        assertNotFoundError,
      );

      assert.equal(mockState.findOneCalls[0].filter.isDeleted, false);
    });

    test("uses the requested id in the filter", async () => {
      const anotherId = new mongoose.Types.ObjectId();
      mockState.findOneResult = null;

      await assert.rejects(
        () =>
          ownerSearchClientRequestByIdService({
            clientRequestId: anotherId.toString(),
            actorId: actorId.toString(),
          }),
        assertNotFoundError,
      );

      assert.equal(mockState.findOneCalls[0].filter._id, anotherId.toString());
    });
  });

  describe("persistence failures", () => {
    test("propagates database errors from findOne", async () => {
      mockState.findOneError = new Error("read failed");

      await assert.rejects(
        () =>
          ownerSearchClientRequestByIdService({
            clientRequestId: clientRequestId.toString(),
            actorId: actorId.toString(),
          }),
        (error) => {
          assert.equal(error.message, "read failed");
          return true;
        },
      );

      assert.equal(mockState.findOneCalls.length, 1);
    });

    test("propagates AppError from the data layer unchanged", async () => {
      mockState.findOneError = new AppError(
        "downstream failure",
        500,
        "INTERNAL_ERROR",
      );

      await assert.rejects(
        () =>
          ownerSearchClientRequestByIdService({
            clientRequestId: clientRequestId.toString(),
            actorId: actorId.toString(),
          }),
        (error) => {
          assert.equal(error instanceof AppError, true);
          assert.equal(error.statusCode, 500);
          assert.equal(error.code, "INTERNAL_ERROR");
          assert.equal(error.message, "downstream failure");
          return true;
        },
      );
    });
  });

  describe("query contract", () => {
    test("uses a single findOne call", async () => {
      mockState.findOneResult = existingDocument;

      await ownerSearchClientRequestByIdService({
        clientRequestId: clientRequestId.toString(),
        actorId: actorId.toString(),
      });

      assert.equal(mockState.findOneCalls.length, 1);
    });

    test("match always includes ownership and soft-delete keys only", async () => {
      mockState.findOneResult = existingDocument;

      await ownerSearchClientRequestByIdService({
        clientRequestId: clientRequestId.toString(),
        actorId: actorId.toString(),
      });

      assert.deepEqual(Object.keys(mockState.findOneCalls[0].filter).sort(), [
        "_id",
        "createdBy",
        "isDeleted",
      ]);
    });

    test("does not mutate status, createdBy, or soft-delete fields", async () => {
      mockState.findOneResult = existingDocument;

      const result = await ownerSearchClientRequestByIdService({
        clientRequestId: clientRequestId.toString(),
        actorId: actorId.toString(),
      });

      assert.equal(result.status, CLIENT_REQUEST_STATUSES.WAITING);
      assert.equal(String(result.createdBy), actorId.toString());
      assert.equal(result.isDeleted, false);
      assert.equal(result.deletedAt, null);
    });
  });
});
