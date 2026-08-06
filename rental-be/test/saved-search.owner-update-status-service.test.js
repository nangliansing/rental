import assert from "node:assert/strict";
import { afterEach, describe, mock, test } from "node:test";

import mongoose from "mongoose";

import { AppError } from "../shared/errors/app-error.js";
import { SAVED_SEARCH_STATUSES } from "../modules/saved-search/saved-search.constants.js";
import { validateOwnerUpdateSavedSearchStatusBody } from "../modules/saved-search/saved-search.validation.js";
import { throwSavedSearchClosed } from "../modules/saved-search/utils/throw-saved-search-closed.js";
import { throwSavedSearchNotFound } from "../modules/saved-search/utils/throw-saved-search-not-found.js";

const actorId = new mongoose.Types.ObjectId();
const otherActorId = new mongoose.Types.ObjectId();
const savedSearchId = new mongoose.Types.ObjectId();

const waitingDocument = {
  _id: savedSearchId,
  createdBy: actorId,
  name: "Sukhumvit 2BR",
  description: "Near BTS",
  status: SAVED_SEARCH_STATUSES.WAITING,
  isDeleted: false,
  deletedAt: null,
};

const closedBody = { status: SAVED_SEARCH_STATUSES.CLOSED };

const mockState = {
  findOneResults: [],
  findOneCalls: [],
  findOneAndUpdateResult: null,
  findOneAndUpdateError: null,
  findOneAndUpdateCalls: [],
};

const createChain = (result, { isUpdate = false } = {}) => {
  const query = {
    usedSession: undefined,
    isUpdate,
    session(session) {
      query.usedSession = session;
      return query;
    },
    then(resolve, reject) {
      if (isUpdate && mockState.findOneAndUpdateError) {
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

mock.module("../modules/saved-search/saved-search.model.js", {
  defaultExport: {
    findOne: (filter) => {
      const result = mockState.findOneResults.shift();
      const query = createChain(result === undefined ? null : result);
      mockState.findOneCalls.push({ filter, query });
      return query;
    },
    findOneAndUpdate: (filter, update, options) => {
      const query = createChain(mockState.findOneAndUpdateResult, {
        isUpdate: true,
      });
      mockState.findOneAndUpdateCalls.push({ filter, update, options, query });
      return query;
    },
  },
});

const { ownerUpdateSavedSearchStatusService } = await import(
  "../modules/saved-search/services/owner-update-saved-search-status.service.js"
);

const resetMockState = () => {
  mockState.findOneResults = [];
  mockState.findOneCalls = [];
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
  return true;
};

const assertNotFoundError = (error) => {
  assert.equal(error instanceof AppError, true);
  assert.equal(error.statusCode, 404);
  assert.equal(error.code, "SAVED_SEARCH_NOT_FOUND");
  assert.equal(error.message, "Saved search not found");
  return true;
};

const assertClosedError = (error) => {
  assert.equal(error instanceof AppError, true);
  assert.equal(error.statusCode, 409);
  assert.equal(error.code, "SAVED_SEARCH_CLOSED");
  assert.equal(error.message, "Closed saved searches cannot be updated");
  return true;
};

afterEach(() => {
  resetMockState();
});

describe("throwSavedSearchClosed", () => {
  test("throws a stable 409 AppError", () => {
    assert.throws(() => throwSavedSearchClosed(), assertClosedError);
  });
});

describe("throwSavedSearchNotFound", () => {
  test("throws a stable 404 AppError", () => {
    assert.throws(() => throwSavedSearchNotFound(), assertNotFoundError);
  });
});

describe("validateOwnerUpdateSavedSearchStatusBody", () => {
  test("accepts Closed with trimming", () => {
    assert.deepEqual(
      validateOwnerUpdateSavedSearchStatusBody({ status: "  Closed  " }),
      { status: SAVED_SEARCH_STATUSES.CLOSED },
    );
  });

  test("rejects null body", () => {
    assert.throws(
      () => validateOwnerUpdateSavedSearchStatusBody(null),
      (error) => assertValidationError(error, "body must be an object"),
    );
  });

  test("rejects non-object body", () => {
    assert.throws(
      () => validateOwnerUpdateSavedSearchStatusBody("Closed"),
      (error) => assertValidationError(error, "body must be an object"),
    );
  });

  test("rejects missing status", () => {
    assert.throws(
      () => validateOwnerUpdateSavedSearchStatusBody({}),
      (error) => assertValidationError(error, "status is required"),
    );
  });

  test("rejects null status", () => {
    assert.throws(
      () => validateOwnerUpdateSavedSearchStatusBody({ status: null }),
      (error) => assertValidationError(error, "status is required"),
    );
  });

  test("rejects Waiting", () => {
    assert.throws(
      () =>
        validateOwnerUpdateSavedSearchStatusBody({
          status: SAVED_SEARCH_STATUSES.WAITING,
        }),
      (error) => assertValidationError(error, "status must be Closed"),
    );
  });

  for (const status of ["", "waiting", "WAITING", "closed", "Open", 1, {}, []]) {
    test(`rejects invalid status: ${JSON.stringify(status)}`, () => {
      assert.throws(
        () => validateOwnerUpdateSavedSearchStatusBody({ status }),
        (error) => assertValidationError(error),
      );
    });
  }

  test("rejects unknown fields even when status is Closed", () => {
    assert.throws(
      () =>
        validateOwnerUpdateSavedSearchStatusBody({
          status: SAVED_SEARCH_STATUSES.CLOSED,
          name: "Nope",
          createdBy: actorId.toString(),
        }),
      (error) =>
        assertValidationError(error, /Unknown fields: name, createdBy/),
    );
  });

  test("rejects unknown fields before evaluating status", () => {
    assert.throws(
      () =>
        validateOwnerUpdateSavedSearchStatusBody({
          name: "Nope",
        }),
      (error) => assertValidationError(error, /Unknown fields: name/),
    );
  });
});

describe("ownerUpdateSavedSearchStatusService", () => {
  describe("successful close", () => {
    test("closes an owned Waiting request atomically", async () => {
      const closedDocument = {
        ...waitingDocument,
        status: SAVED_SEARCH_STATUSES.CLOSED,
      };
      mockState.findOneAndUpdateResult = closedDocument;

      const result = await ownerUpdateSavedSearchStatusService({
        savedSearchId: savedSearchId.toString(),
        actorId: actorId.toString(),
        body: closedBody,
        session: null,
      });

      assert.equal(mockState.findOneAndUpdateCalls.length, 1);
      const [{ filter, update, options, query }] =
        mockState.findOneAndUpdateCalls;

      assert.deepEqual(filter, {
        _id: savedSearchId.toString(),
        createdBy: actorId.toString(),
        isDeleted: false,
        status: SAVED_SEARCH_STATUSES.WAITING,
      });
      assert.deepEqual(update, {
        $set: { status: SAVED_SEARCH_STATUSES.CLOSED },
      });
      assert.deepEqual(Object.keys(update.$set), ["status"]);
      assert.deepEqual(options, {
        returnDocument: "after",
        runValidators: true,
      });
      assert.equal(query.usedSession, undefined);
      assert.equal(result, closedDocument);
      assert.equal(mockState.findOneCalls.length, 0);
    });

    test("accepts ObjectId inputs", async () => {
      mockState.findOneAndUpdateResult = {
        ...waitingDocument,
        status: SAVED_SEARCH_STATUSES.CLOSED,
      };

      await ownerUpdateSavedSearchStatusService({
        savedSearchId,
        actorId,
        body: closedBody,
      });

      assert.deepEqual(mockState.findOneAndUpdateCalls[0].filter, {
        _id: savedSearchId.toString(),
        createdBy: actorId.toString(),
        isDeleted: false,
        status: SAVED_SEARCH_STATUSES.WAITING,
      });
    });

    test("trims Closed status from the body", async () => {
      mockState.findOneAndUpdateResult = {
        ...waitingDocument,
        status: SAVED_SEARCH_STATUSES.CLOSED,
      };

      await ownerUpdateSavedSearchStatusService({
        savedSearchId: savedSearchId.toString(),
        actorId: actorId.toString(),
        body: { status: "  Closed  " },
      });

      assert.deepEqual(mockState.findOneAndUpdateCalls[0].update, {
        $set: { status: SAVED_SEARCH_STATUSES.CLOSED },
      });
    });

    test("defaults session to null when omitted", async () => {
      mockState.findOneAndUpdateResult = {
        ...waitingDocument,
        status: SAVED_SEARCH_STATUSES.CLOSED,
      };

      await ownerUpdateSavedSearchStatusService({
        savedSearchId: savedSearchId.toString(),
        actorId: actorId.toString(),
        body: closedBody,
      });

      assert.equal(
        mockState.findOneAndUpdateCalls[0].query.usedSession,
        undefined,
      );
    });

    test("does not attach session when session is explicitly null", async () => {
      mockState.findOneAndUpdateResult = {
        ...waitingDocument,
        status: SAVED_SEARCH_STATUSES.CLOSED,
      };

      await ownerUpdateSavedSearchStatusService({
        savedSearchId: savedSearchId.toString(),
        actorId: actorId.toString(),
        body: closedBody,
        session: null,
      });

      assert.equal(
        mockState.findOneAndUpdateCalls[0].query.usedSession,
        undefined,
      );
    });

    test("attaches a valid session to the update query", async () => {
      const session = { id: "fake-mongoose-session" };
      mockState.findOneAndUpdateResult = {
        ...waitingDocument,
        status: SAVED_SEARCH_STATUSES.CLOSED,
      };

      await ownerUpdateSavedSearchStatusService({
        savedSearchId: savedSearchId.toString(),
        actorId: actorId.toString(),
        body: closedBody,
        session,
      });

      assert.equal(
        mockState.findOneAndUpdateCalls[0].query.usedSession,
        session,
      );
      assert.equal(mockState.findOneCalls.length, 0);
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
      ["invalid 24-char hex", "zzzzzzzzzzzzzzzzzzzzzzzz"],
      ["number", 123],
      ["boolean", false],
      ["object", {}],
      ["array", []],
    ]) {
      test(`rejects invalid savedSearchId: ${label}`, async () => {
        await assert.rejects(
          () =>
            ownerUpdateSavedSearchStatusService({
              savedSearchId: value,
              actorId: actorId.toString(),
              body: closedBody,
            }),
          (error) => assertValidationError(error, /savedSearchId/),
        );

        assert.equal(mockState.findOneAndUpdateCalls.length, 0);
      });

      test(`rejects invalid actorId: ${label}`, async () => {
        await assert.rejects(
          () =>
            ownerUpdateSavedSearchStatusService({
              savedSearchId: savedSearchId.toString(),
              actorId: value,
              body: closedBody,
            }),
          (error) => assertValidationError(error, /actorId/),
        );

        assert.equal(mockState.findOneAndUpdateCalls.length, 0);
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
            ownerUpdateSavedSearchStatusService({
              savedSearchId: savedSearchId.toString(),
              actorId: actorId.toString(),
              body: closedBody,
              session: value,
            }),
          (error) => assertValidationError(error, "session must be an object"),
        );

        assert.equal(mockState.findOneAndUpdateCalls.length, 0);
      });
    }

    test("validates session before other inputs when session is invalid", async () => {
      await assert.rejects(
        () =>
          ownerUpdateSavedSearchStatusService({
            savedSearchId: "bad-id",
            actorId: "bad-id",
            body: { status: "Waiting" },
            session: "bad-session",
          }),
        (error) => assertValidationError(error, "session must be an object"),
      );

      assert.equal(mockState.findOneAndUpdateCalls.length, 0);
    });

    test("rejects invalid body before writing", async () => {
      await assert.rejects(
        () =>
          ownerUpdateSavedSearchStatusService({
            savedSearchId: savedSearchId.toString(),
            actorId: actorId.toString(),
            body: { status: SAVED_SEARCH_STATUSES.WAITING },
          }),
        (error) => assertValidationError(error, "status must be Closed"),
      );

      assert.equal(mockState.findOneAndUpdateCalls.length, 0);
    });

    test("rejects null body before writing", async () => {
      await assert.rejects(
        () =>
          ownerUpdateSavedSearchStatusService({
            savedSearchId: savedSearchId.toString(),
            actorId: actorId.toString(),
            body: null,
          }),
        (error) => assertValidationError(error, "body must be an object"),
      );

      assert.equal(mockState.findOneAndUpdateCalls.length, 0);
    });
  });

  describe("not found / ownership / already closed / soft-delete", () => {
    test("returns 404 when missing or not owned", async () => {
      mockState.findOneAndUpdateResult = null;
      mockState.findOneResults = [null];

      await assert.rejects(
        () =>
          ownerUpdateSavedSearchStatusService({
            savedSearchId: savedSearchId.toString(),
            actorId: otherActorId.toString(),
            body: closedBody,
          }),
        assertNotFoundError,
      );

      assert.deepEqual(mockState.findOneAndUpdateCalls[0].filter, {
        _id: savedSearchId.toString(),
        createdBy: otherActorId.toString(),
        isDeleted: false,
        status: SAVED_SEARCH_STATUSES.WAITING,
      });
      assert.deepEqual(mockState.findOneCalls[0].filter, {
        _id: savedSearchId.toString(),
        createdBy: otherActorId.toString(),
        isDeleted: false,
      });
    });

    test("returns 409 when the request is already Closed", async () => {
      mockState.findOneAndUpdateResult = null;
      mockState.findOneResults = [
        {
          ...waitingDocument,
          status: SAVED_SEARCH_STATUSES.CLOSED,
        },
      ];

      await assert.rejects(
        () =>
          ownerUpdateSavedSearchStatusService({
            savedSearchId: savedSearchId.toString(),
            actorId: actorId.toString(),
            body: closedBody,
          }),
        assertClosedError,
      );

      assert.equal(mockState.findOneAndUpdateCalls.length, 1);
      assert.equal(mockState.findOneCalls.length, 1);
    });

    test("returns 404 when owned but soft-deleted", async () => {
      mockState.findOneAndUpdateResult = null;
      // soft-deleted rows are excluded by ownerFilter on the race find
      mockState.findOneResults = [null];

      await assert.rejects(
        () =>
          ownerUpdateSavedSearchStatusService({
            savedSearchId: savedSearchId.toString(),
            actorId: actorId.toString(),
            body: closedBody,
          }),
        assertNotFoundError,
      );

      assert.equal(
        mockState.findOneAndUpdateCalls[0].filter.isDeleted,
        false,
      );
      assert.equal(mockState.findOneCalls[0].filter.isDeleted, false);
    });

    test("race findOne uses ownership filter without Waiting status", async () => {
      mockState.findOneAndUpdateResult = null;
      mockState.findOneResults = [
        {
          ...waitingDocument,
          status: SAVED_SEARCH_STATUSES.CLOSED,
        },
      ];

      await assert.rejects(
        () =>
          ownerUpdateSavedSearchStatusService({
            savedSearchId: savedSearchId.toString(),
            actorId: actorId.toString(),
            body: closedBody,
          }),
        assertClosedError,
      );

      assert.equal(
        Object.hasOwn(mockState.findOneCalls[0].filter, "status"),
        false,
      );
    });

    test("attaches session to the race findOne query", async () => {
      const session = { id: "fake-mongoose-session" };
      mockState.findOneAndUpdateResult = null;
      mockState.findOneResults = [
        {
          ...waitingDocument,
          status: SAVED_SEARCH_STATUSES.CLOSED,
        },
      ];

      await assert.rejects(
        () =>
          ownerUpdateSavedSearchStatusService({
            savedSearchId: savedSearchId.toString(),
            actorId: actorId.toString(),
            body: closedBody,
            session,
          }),
        assertClosedError,
      );

      assert.equal(
        mockState.findOneAndUpdateCalls[0].query.usedSession,
        session,
      );
      assert.equal(mockState.findOneCalls[0].query.usedSession, session);
    });

    test("returns 404 when race find returns Waiting unexpectedly", async () => {
      // update missed for another reason; race still sees Waiting
      mockState.findOneAndUpdateResult = null;
      mockState.findOneResults = [waitingDocument];

      await assert.rejects(
        () =>
          ownerUpdateSavedSearchStatusService({
            savedSearchId: savedSearchId.toString(),
            actorId: actorId.toString(),
            body: closedBody,
          }),
        assertNotFoundError,
      );
    });
  });

  describe("persistence failures", () => {
    test("propagates database errors from findOneAndUpdate", async () => {
      mockState.findOneAndUpdateError = new Error("write failed");

      await assert.rejects(
        () =>
          ownerUpdateSavedSearchStatusService({
            savedSearchId: savedSearchId.toString(),
            actorId: actorId.toString(),
            body: closedBody,
          }),
        (error) => {
          assert.equal(error.message, "write failed");
          return true;
        },
      );

      assert.equal(mockState.findOneAndUpdateCalls.length, 1);
      assert.equal(mockState.findOneCalls.length, 0);
    });
  });

  describe("write contract", () => {
    test("uses a single atomic findOneAndUpdate on success", async () => {
      mockState.findOneAndUpdateResult = {
        ...waitingDocument,
        status: SAVED_SEARCH_STATUSES.CLOSED,
      };

      await ownerUpdateSavedSearchStatusService({
        savedSearchId: savedSearchId.toString(),
        actorId: actorId.toString(),
        body: closedBody,
      });

      assert.equal(mockState.findOneAndUpdateCalls.length, 1);
      assert.equal(mockState.findOneCalls.length, 0);
    });

    test("write filter always requires Waiting and isDeleted false", async () => {
      mockState.findOneAndUpdateResult = {
        ...waitingDocument,
        status: SAVED_SEARCH_STATUSES.CLOSED,
      };

      await ownerUpdateSavedSearchStatusService({
        savedSearchId: savedSearchId.toString(),
        actorId: actorId.toString(),
        body: closedBody,
      });

      const { filter } = mockState.findOneAndUpdateCalls[0];
      assert.equal(filter.status, SAVED_SEARCH_STATUSES.WAITING);
      assert.equal(filter.isDeleted, false);
      assert.deepEqual(Object.keys(filter).sort(), [
        "_id",
        "createdBy",
        "isDeleted",
        "status",
      ]);
    });

    test("only sets status in $set", async () => {
      mockState.findOneAndUpdateResult = {
        ...waitingDocument,
        status: SAVED_SEARCH_STATUSES.CLOSED,
      };

      await ownerUpdateSavedSearchStatusService({
        savedSearchId: savedSearchId.toString(),
        actorId: actorId.toString(),
        body: closedBody,
      });

      const { update } = mockState.findOneAndUpdateCalls[0];
      assert.deepEqual(Object.keys(update), ["$set"]);
      assert.deepEqual(Object.keys(update.$set), ["status"]);
      for (const fieldName of [
        "createdBy",
        "name",
        "isDeleted",
        "deletedAt",
        "geoSearch",
        "filters",
      ]) {
        assert.equal(Object.hasOwn(update.$set, fieldName), false);
      }
    });
  });
});
