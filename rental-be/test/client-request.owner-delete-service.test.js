import assert from "node:assert/strict";
import { afterEach, describe, mock, test } from "node:test";

import mongoose from "mongoose";

import { AppError } from "../shared/errors/app-error.js";
import { CLIENT_REQUEST_STATUSES } from "../modules/client-request/client-request.constants.js";
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
    mode: "area",
    bounds: {
      northEast: { lat: 13.78, lng: 100.66 },
      southWest: { lat: 13.75, lng: 100.62 },
    },
  },
  filters: {
    minRent: 15_000,
  },
  isDeleted: false,
  deletedAt: null,
};

const mockState = {
  findOneAndUpdateResult: null,
  findOneAndUpdateError: null,
  findOneAndUpdateCalls: [],
};

const createChain = (result) => {
  const query = {
    usedSession: undefined,
    session(session) {
      query.usedSession = session;
      return query;
    },
    then(resolve, reject) {
      if (mockState.findOneAndUpdateError) {
        return Promise.reject(mockState.findOneAndUpdateError).then(
          resolve,
          reject,
        );
      }

      return Promise.resolve(result).then(resolve, reject);
    },
  };

  return query;
};

mock.module("../modules/client-request/client-request.model.js", {
  defaultExport: {
    findOneAndUpdate: (filter, update, options) => {
      const query = createChain(mockState.findOneAndUpdateResult);
      mockState.findOneAndUpdateCalls.push({
        filter,
        update,
        options,
        query,
      });
      return query;
    },
  },
});

const { ownerDeleteClientRequestService } = await import(
  "../modules/client-request/services/owner-delete-client-request.service.js"
);

const resetMockState = () => {
  mockState.findOneAndUpdateResult = null;
  mockState.findOneAndUpdateError = null;
  mockState.findOneAndUpdateCalls = [];
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
  test("builds ownership + soft-delete filter", () => {
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
});

describe("throwClientRequestNotFound", () => {
  test("throws a stable 404 AppError", () => {
    assert.throws(() => throwClientRequestNotFound(), assertNotFoundError);
  });
});

describe("ownerDeleteClientRequestService", () => {
  describe("successful soft delete", () => {
    test("soft-deletes an owned Waiting request and returns the updated document", async () => {
      const deletedDocument = {
        ...existingDocument,
        isDeleted: true,
        deletedAt: new Date("2026-08-03T21:30:00.000Z"),
      };
      mockState.findOneAndUpdateResult = deletedDocument;

      const before = Date.now();
      const result = await ownerDeleteClientRequestService({
        clientRequestId: clientRequestId.toString(),
        actorId: actorId.toString(),
        session: null,
      });
      const after = Date.now();

      assert.equal(mockState.findOneAndUpdateCalls.length, 1);
      const [{ filter, update, options }] = mockState.findOneAndUpdateCalls;

      assert.deepEqual(filter, {
        _id: clientRequestId.toString(),
        createdBy: actorId.toString(),
        isDeleted: false,
      });
      assert.deepEqual(Object.keys(update), ["$set"]);
      assert.deepEqual(Object.keys(update.$set).sort(), [
        "deletedAt",
        "isDeleted",
      ]);
      assert.equal(update.$set.isDeleted, true);
      assert.equal(update.$set.deletedAt instanceof Date, true);
      assert.equal(update.$set.deletedAt.getTime() >= before, true);
      assert.equal(update.$set.deletedAt.getTime() <= after, true);
      assert.deepEqual(options, {
        returnDocument: "after",
        runValidators: true,
      });
      assert.equal(result, deletedDocument);
    });

    test("soft-deletes an owned Closed request without changing status", async () => {
      const deletedDocument = {
        ...existingDocument,
        status: CLIENT_REQUEST_STATUSES.CLOSED,
        isDeleted: true,
        deletedAt: new Date(),
      };
      mockState.findOneAndUpdateResult = deletedDocument;

      const result = await ownerDeleteClientRequestService({
        clientRequestId: clientRequestId.toString(),
        actorId: actorId.toString(),
      });

      const [{ filter, update }] = mockState.findOneAndUpdateCalls;
      assert.equal(filter.isDeleted, false);
      assert.equal(Object.hasOwn(filter, "status"), false);
      assert.equal(Object.hasOwn(update.$set, "status"), false);
      assert.equal(Object.hasOwn(update.$set, "createdBy"), false);
      assert.equal(result.status, CLIENT_REQUEST_STATUSES.CLOSED);
      assert.equal(result.isDeleted, true);
    });

    test("accepts ObjectId inputs for clientRequestId and actorId", async () => {
      mockState.findOneAndUpdateResult = {
        ...existingDocument,
        isDeleted: true,
        deletedAt: new Date(),
      };

      await ownerDeleteClientRequestService({
        clientRequestId,
        actorId,
      });

      const [{ filter }] = mockState.findOneAndUpdateCalls;
      assert.deepEqual(filter, {
        _id: clientRequestId.toString(),
        createdBy: actorId.toString(),
        isDeleted: false,
      });
    });

    test("defaults session to null when omitted", async () => {
      mockState.findOneAndUpdateResult = {
        ...existingDocument,
        isDeleted: true,
        deletedAt: new Date(),
      };

      await ownerDeleteClientRequestService({
        clientRequestId: clientRequestId.toString(),
        actorId: actorId.toString(),
      });

      assert.equal(mockState.findOneAndUpdateCalls.length, 1);
      assert.equal(
        mockState.findOneAndUpdateCalls[0].query.usedSession,
        undefined,
      );
    });

    test("does not attach session when session is explicitly null", async () => {
      mockState.findOneAndUpdateResult = {
        ...existingDocument,
        isDeleted: true,
        deletedAt: new Date(),
      };

      await ownerDeleteClientRequestService({
        clientRequestId: clientRequestId.toString(),
        actorId: actorId.toString(),
        session: null,
      });

      assert.equal(
        mockState.findOneAndUpdateCalls[0].query.usedSession,
        undefined,
      );
    });

    test("attaches a valid session to the write query", async () => {
      const session = { id: "fake-mongoose-session" };
      mockState.findOneAndUpdateResult = {
        ...existingDocument,
        isDeleted: true,
        deletedAt: new Date(),
      };

      await ownerDeleteClientRequestService({
        clientRequestId: clientRequestId.toString(),
        actorId: actorId.toString(),
        session,
      });

      assert.equal(
        mockState.findOneAndUpdateCalls[0].query.usedSession,
        session,
      );
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
      ["number", 123],
      ["object", {}],
      ["array", []],
    ]) {
      test(`rejects invalid clientRequestId: ${label}`, async () => {
        await assert.rejects(
          () =>
            ownerDeleteClientRequestService({
              clientRequestId: value,
              actorId: actorId.toString(),
            }),
          (error) => {
            assertValidationError(error, /clientRequestId/);
            return true;
          },
        );

        assert.equal(mockState.findOneAndUpdateCalls.length, 0);
      });

      test(`rejects invalid actorId: ${label}`, async () => {
        await assert.rejects(
          () =>
            ownerDeleteClientRequestService({
              clientRequestId: clientRequestId.toString(),
              actorId: value,
            }),
          (error) => {
            assertValidationError(error, /actorId/);
            return true;
          },
        );

        assert.equal(mockState.findOneAndUpdateCalls.length, 0);
      });
    }

    for (const [label, value] of [
      ["string", "bad-session"],
      ["number", 1],
      ["array", []],
      ["true", true],
    ]) {
      test(`rejects invalid session: ${label}`, async () => {
        await assert.rejects(
          () =>
            ownerDeleteClientRequestService({
              clientRequestId: clientRequestId.toString(),
              actorId: actorId.toString(),
              session: value,
            }),
          (error) => {
            assertValidationError(error, "session must be an object");
            return true;
          },
        );

        assert.equal(mockState.findOneAndUpdateCalls.length, 0);
      });
    }

    test("validates session before ids when session is invalid", async () => {
      await assert.rejects(
        () =>
          ownerDeleteClientRequestService({
            clientRequestId: "also-bad",
            actorId: "also-bad",
            session: "bad-session",
          }),
        (error) => {
          assertValidationError(error, "session must be an object");
          return true;
        },
      );

      assert.equal(mockState.findOneAndUpdateCalls.length, 0);
    });
  });

  describe("not found / ownership / already deleted", () => {
    test("returns 404 when findOneAndUpdate matches nothing", async () => {
      mockState.findOneAndUpdateResult = null;

      await assert.rejects(
        () =>
          ownerDeleteClientRequestService({
            clientRequestId: clientRequestId.toString(),
            actorId: actorId.toString(),
          }),
        assertNotFoundError,
      );

      assert.equal(mockState.findOneAndUpdateCalls.length, 1);
    });

    test("uses the caller actorId in the ownership filter", async () => {
      mockState.findOneAndUpdateResult = null;

      await assert.rejects(
        () =>
          ownerDeleteClientRequestService({
            clientRequestId: clientRequestId.toString(),
            actorId: otherActorId.toString(),
          }),
        assertNotFoundError,
      );

      assert.deepEqual(mockState.findOneAndUpdateCalls[0].filter, {
        _id: clientRequestId.toString(),
        createdBy: otherActorId.toString(),
        isDeleted: false,
      });
    });

    test("always requires isDeleted false so already-deleted rows 404", async () => {
      mockState.findOneAndUpdateResult = null;

      await assert.rejects(
        () =>
          ownerDeleteClientRequestService({
            clientRequestId: clientRequestId.toString(),
            actorId: actorId.toString(),
          }),
        assertNotFoundError,
      );

      assert.equal(
        mockState.findOneAndUpdateCalls[0].filter.isDeleted,
        false,
      );
    });
  });

  describe("persistence failures", () => {
    test("propagates database errors from findOneAndUpdate", async () => {
      mockState.findOneAndUpdateError = new Error("write failed");

      await assert.rejects(
        () =>
          ownerDeleteClientRequestService({
            clientRequestId: clientRequestId.toString(),
            actorId: actorId.toString(),
          }),
        (error) => {
          assert.equal(error.message, "write failed");
          return true;
        },
      );

      assert.equal(mockState.findOneAndUpdateCalls.length, 1);
    });
  });

  describe("write contract", () => {
    test("never mutates status, createdBy, name, or geoSearch in $set", async () => {
      mockState.findOneAndUpdateResult = {
        ...existingDocument,
        isDeleted: true,
        deletedAt: new Date(),
      };

      await ownerDeleteClientRequestService({
        clientRequestId: clientRequestId.toString(),
        actorId: actorId.toString(),
      });

      const { update } = mockState.findOneAndUpdateCalls[0];
      for (const fieldName of [
        "status",
        "createdBy",
        "name",
        "description",
        "geoSearch",
        "filters",
        "deletedBy",
        "deleteReason",
      ]) {
        assert.equal(Object.hasOwn(update.$set, fieldName), false);
      }
    });

    test("uses a single atomic findOneAndUpdate call", async () => {
      mockState.findOneAndUpdateResult = {
        ...existingDocument,
        isDeleted: true,
        deletedAt: new Date(),
      };

      await ownerDeleteClientRequestService({
        clientRequestId: clientRequestId.toString(),
        actorId: actorId.toString(),
      });

      assert.equal(mockState.findOneAndUpdateCalls.length, 1);
    });
  });
});
