import assert from "node:assert/strict";
import { afterEach, describe, mock, test } from "node:test";

import mongoose from "mongoose";

import { AppError } from "../shared/errors/app-error.js";
import { CLIENT_REQUEST_STATUSES } from "../modules/client-request/client-request.constants.js";
import { buildOwnerClientRequestListMatch } from "../modules/client-request/utils/build-owner-client-request-list-match.js";
import { buildOwnerSearchClientRequestsPipeline } from "../modules/client-request/pipelines/build-owner-search-client-requests.pipeline.js";

const actorId = new mongoose.Types.ObjectId();
const otherActorId = new mongoose.Types.ObjectId();

const mockState = {
  aggregateResult: null,
  aggregateError: null,
  aggregateCalls: [],
};

const createChain = (result) => {
  const query = {
    usedSession: undefined,
    session(session) {
      query.usedSession = session;
      return query;
    },
    then(resolve, reject) {
      if (mockState.aggregateError) {
        return Promise.reject(mockState.aggregateError).then(resolve, reject);
      }

      return Promise.resolve(result).then(resolve, reject);
    },
  };

  return query;
};

mock.module("../modules/client-request/client-request.model.js", {
  defaultExport: {
    aggregate: (pipeline) => {
      const query = createChain(mockState.aggregateResult);
      mockState.aggregateCalls.push({ pipeline, query });
      return query;
    },
  },
});

const { ownerSearchClientRequestsService } = await import(
  "../modules/client-request/services/owner-search-client-requests.service.js"
);

const emptyAggregateResult = [
  {
    data: [],
    pagination: { page: 1, limit: 20, total: 0 },
  },
];

const resetMockState = () => {
  mockState.aggregateResult = null;
  mockState.aggregateError = null;
  mockState.aggregateCalls = [];
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

const getMatch = () => mockState.aggregateCalls[0].pipeline[0].$match;
const getFacetData = () => mockState.aggregateCalls[0].pipeline[1].$facet.data;

afterEach(() => {
  resetMockState();
});

describe("buildOwnerClientRequestListMatch", () => {
  test("builds owner + soft-delete match without status by default", () => {
    assert.deepEqual(buildOwnerClientRequestListMatch({ actorId }), {
      createdBy: actorId,
      isDeleted: false,
    });
  });

  test("adds Waiting and Closed status when provided", () => {
    assert.deepEqual(
      buildOwnerClientRequestListMatch({
        actorId,
        status: CLIENT_REQUEST_STATUSES.WAITING,
      }),
      {
        createdBy: actorId,
        isDeleted: false,
        status: CLIENT_REQUEST_STATUSES.WAITING,
      },
    );

    assert.deepEqual(
      buildOwnerClientRequestListMatch({
        actorId,
        status: CLIENT_REQUEST_STATUSES.CLOSED,
      }),
      {
        createdBy: actorId,
        isDeleted: false,
        status: CLIENT_REQUEST_STATUSES.CLOSED,
      },
    );
  });

  test("ignores null and undefined status", () => {
    assert.deepEqual(
      buildOwnerClientRequestListMatch({
        actorId,
        status: null,
      }),
      {
        createdBy: actorId,
        isDeleted: false,
      },
    );

    assert.deepEqual(
      buildOwnerClientRequestListMatch({
        actorId,
        status: undefined,
      }),
      {
        createdBy: actorId,
        isDeleted: false,
      },
    );
  });

  test("never includes isDeleted true or other ownership fields", () => {
    const match = buildOwnerClientRequestListMatch({
      actorId,
      status: CLIENT_REQUEST_STATUSES.WAITING,
    });

    assert.deepEqual(Object.keys(match).sort(), [
      "createdBy",
      "isDeleted",
      "status",
    ]);
    assert.equal(match.isDeleted, false);
  });
});

describe("buildOwnerSearchClientRequestsPipeline", () => {
  test("uses the provided match as the first stage", () => {
    const match = {
      createdBy: actorId,
      isDeleted: false,
      status: CLIENT_REQUEST_STATUSES.WAITING,
    };

    const pipeline = buildOwnerSearchClientRequestsPipeline({
      match,
      page: 1,
      skip: 0,
      limit: 20,
    });

    assert.deepEqual(pipeline[0], { $match: match });
    assert.equal(pipeline[0].$match === match, true);
  });

  test("sorts availableBy sooner-first with missing dates last", () => {
    const pipeline = buildOwnerSearchClientRequestsPipeline({
      match: { createdBy: actorId, isDeleted: false },
      page: 1,
      skip: 0,
      limit: 20,
    });

    const [addFields, sort] = pipeline[1].$facet.data;

    assert.deepEqual(addFields, {
      $addFields: {
        _hasAvailableBy: {
          $cond: [
            {
              $ne: [{ $ifNull: ["$filters.availableBy", null] }, null],
            },
            0,
            1,
          ],
        },
      },
    });
    assert.deepEqual(sort, {
      $sort: {
        _hasAvailableBy: 1,
        "filters.availableBy": 1,
        createdAt: -1,
        _id: 1,
      },
    });
  });

  test("applies skip/limit and strips the temporary sort flag", () => {
    const pipeline = buildOwnerSearchClientRequestsPipeline({
      match: { createdBy: actorId, isDeleted: false },
      page: 3,
      skip: 40,
      limit: 20,
    });

    const dataStages = pipeline[1].$facet.data;
    assert.deepEqual(dataStages[2], { $skip: 40 });
    assert.deepEqual(dataStages[3], { $limit: 20 });
    assert.deepEqual(dataStages[4], {
      $project: {
        _hasAvailableBy: 0,
      },
    });
  });

  test("counts totals and projects page/limit/total pagination", () => {
    const pipeline = buildOwnerSearchClientRequestsPipeline({
      match: { createdBy: actorId, isDeleted: false },
      page: 4,
      skip: 60,
      limit: 15,
    });

    assert.deepEqual(pipeline[1].$facet.pagination, [{ $count: "total" }]);
    assert.deepEqual(pipeline[2].$project.pagination, {
      page: { $literal: 4 },
      limit: { $literal: 15 },
      total: {
        $ifNull: [{ $arrayElemAt: ["$pagination.total", 0] }, 0],
      },
    });
  });
});

describe("ownerSearchClientRequestsService", () => {
  describe("successful list", () => {
    test("returns rows and pagination for the owner Waiting list", async () => {
      const rows = [
        {
          _id: new mongoose.Types.ObjectId(),
          name: "Sooner",
          status: CLIENT_REQUEST_STATUSES.WAITING,
          filters: { availableBy: new Date("2026-09-01T17:00:00.000Z") },
        },
      ];
      mockState.aggregateResult = [
        {
          data: rows,
          pagination: { page: 1, limit: 20, total: 1 },
        },
      ];

      const result = await ownerSearchClientRequestsService({
        queryInput: {},
        actorId: actorId.toString(),
        session: null,
      });

      assert.equal(mockState.aggregateCalls.length, 1);
      assert.deepEqual(getMatch(), {
        createdBy: actorId,
        isDeleted: false,
        status: CLIENT_REQUEST_STATUSES.WAITING,
      });
      assert.equal(mockState.aggregateCalls[0].query.usedSession, undefined);
      assert.deepEqual(result.clientRequests, rows);
      assert.deepEqual(result.pagination, {
        page: 1,
        limit: 20,
        total: 1,
      });
    });

    test("defaults omitted status to Waiting", async () => {
      mockState.aggregateResult = emptyAggregateResult;

      await ownerSearchClientRequestsService({
        queryInput: {},
        actorId: actorId.toString(),
      });

      assert.equal(getMatch().status, CLIENT_REQUEST_STATUSES.WAITING);
    });

    test("defaults null status to Waiting", async () => {
      mockState.aggregateResult = emptyAggregateResult;

      await ownerSearchClientRequestsService({
        queryInput: { status: null },
        actorId: actorId.toString(),
      });

      assert.equal(getMatch().status, CLIENT_REQUEST_STATUSES.WAITING);
    });

    test("accepts explicit Waiting and Closed statuses", async () => {
      mockState.aggregateResult = emptyAggregateResult;

      await ownerSearchClientRequestsService({
        queryInput: { status: "  Waiting  " },
        actorId: actorId.toString(),
      });
      assert.equal(getMatch().status, CLIENT_REQUEST_STATUSES.WAITING);

      resetMockState();
      mockState.aggregateResult = emptyAggregateResult;

      await ownerSearchClientRequestsService({
        queryInput: { status: "Closed" },
        actorId: actorId.toString(),
      });
      assert.equal(getMatch().status, CLIENT_REQUEST_STATUSES.CLOSED);
    });

    test("accepts ObjectId actorId inputs", async () => {
      mockState.aggregateResult = emptyAggregateResult;

      await ownerSearchClientRequestsService({
        queryInput: {},
        actorId,
      });

      assert.deepEqual(getMatch().createdBy, actorId);
    });

    test("uses the caller actorId in the ownership match", async () => {
      mockState.aggregateResult = emptyAggregateResult;

      await ownerSearchClientRequestsService({
        queryInput: {},
        actorId: otherActorId.toString(),
      });

      assert.deepEqual(getMatch(), {
        createdBy: otherActorId,
        isDeleted: false,
        status: CLIENT_REQUEST_STATUSES.WAITING,
      });
    });

    test("always excludes soft-deleted rows in the match", async () => {
      mockState.aggregateResult = emptyAggregateResult;

      await ownerSearchClientRequestsService({
        queryInput: { status: CLIENT_REQUEST_STATUSES.CLOSED },
        actorId: actorId.toString(),
      });

      assert.equal(getMatch().isDeleted, false);
    });

    test("wires default pagination into skip/limit", async () => {
      mockState.aggregateResult = emptyAggregateResult;

      await ownerSearchClientRequestsService({
        queryInput: {},
        actorId: actorId.toString(),
      });

      assert.deepEqual(getFacetData()[2], { $skip: 0 });
      assert.deepEqual(getFacetData()[3], { $limit: 20 });
    });

    test("wires page/limit into skip/limit for later pages", async () => {
      mockState.aggregateResult = [
        {
          data: [],
          pagination: { page: 3, limit: 5, total: 0 },
        },
      ];

      const result = await ownerSearchClientRequestsService({
        queryInput: {
          page: "3",
          limit: "5",
          status: CLIENT_REQUEST_STATUSES.CLOSED,
        },
        actorId: actorId.toString(),
      });

      assert.deepEqual(getMatch().status, CLIENT_REQUEST_STATUSES.CLOSED);
      assert.deepEqual(getFacetData()[2], { $skip: 10 });
      assert.deepEqual(getFacetData()[3], { $limit: 5 });
      assert.deepEqual(result.pagination, {
        page: 3,
        limit: 5,
        total: 0,
      });
    });

    test("accepts numeric page and limit values", async () => {
      mockState.aggregateResult = [
        {
          data: [],
          pagination: { page: 2, limit: 10, total: 0 },
        },
      ];

      await ownerSearchClientRequestsService({
        queryInput: { page: 2, limit: 10 },
        actorId: actorId.toString(),
      });

      assert.deepEqual(getFacetData()[2], { $skip: 10 });
      assert.deepEqual(getFacetData()[3], { $limit: 10 });
    });

    test("defaults session to null when omitted and does not attach it", async () => {
      mockState.aggregateResult = emptyAggregateResult;

      await ownerSearchClientRequestsService({
        queryInput: {},
        actorId: actorId.toString(),
      });

      assert.equal(mockState.aggregateCalls[0].query.usedSession, undefined);
    });

    test("does not attach session when session is explicitly null", async () => {
      mockState.aggregateResult = emptyAggregateResult;

      await ownerSearchClientRequestsService({
        queryInput: {},
        actorId: actorId.toString(),
        session: null,
      });

      assert.equal(mockState.aggregateCalls[0].query.usedSession, undefined);
    });

    test("attaches a valid session to the aggregate query", async () => {
      const session = { id: "fake-mongoose-session" };
      mockState.aggregateResult = emptyAggregateResult;

      await ownerSearchClientRequestsService({
        queryInput: {},
        actorId: actorId.toString(),
        session,
      });

      assert.equal(mockState.aggregateCalls[0].query.usedSession, session);
    });

    test("includes the availableBy nulls-last sort stages in the pipeline", async () => {
      mockState.aggregateResult = emptyAggregateResult;

      await ownerSearchClientRequestsService({
        queryInput: {},
        actorId: actorId.toString(),
      });

      assert.equal(Object.hasOwn(getFacetData()[0], "$addFields"), true);
      assert.deepEqual(getFacetData()[1].$sort, {
        _hasAvailableBy: 1,
        "filters.availableBy": 1,
        createdAt: -1,
        _id: 1,
      });
    });
  });

  describe("empty and edge aggregate results", () => {
    test("returns empty data when aggregate yields no facet row", async () => {
      mockState.aggregateResult = [];

      const result = await ownerSearchClientRequestsService({
        queryInput: {},
        actorId: actorId.toString(),
      });

      assert.deepEqual(result.clientRequests, []);
      assert.deepEqual(result.pagination, {
        page: 1,
        limit: 20,
        total: 0,
      });
    });

    test("returns empty data when facet data is missing", async () => {
      mockState.aggregateResult = [{ pagination: { total: 0 } }];

      const result = await ownerSearchClientRequestsService({
        queryInput: {},
        actorId: actorId.toString(),
      });

      assert.deepEqual(result.clientRequests, []);
      assert.equal(result.pagination.total, 0);
    });

    test("normalizes facet-array pagination totals", async () => {
      mockState.aggregateResult = [
        {
          data: [{ name: "One" }],
          pagination: [{ total: 7 }],
        },
      ];

      const result = await ownerSearchClientRequestsService({
        queryInput: { page: "1", limit: "20" },
        actorId: actorId.toString(),
      });

      assert.deepEqual(result.clientRequests, [{ name: "One" }]);
      assert.deepEqual(result.pagination, {
        page: 1,
        limit: 20,
        total: 7,
      });
    });
  });

  describe("input validation", () => {
    test("rejects a non-object query", async () => {
      await assert.rejects(
        () =>
          ownerSearchClientRequestsService({
            queryInput: null,
            actorId: actorId.toString(),
          }),
        (error) => assertValidationError(error, "query must be an object"),
      );

      assert.equal(mockState.aggregateCalls.length, 0);
    });

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
      test(`rejects invalid actorId: ${label}`, async () => {
        await assert.rejects(
          () =>
            ownerSearchClientRequestsService({
              queryInput: {},
              actorId: value,
            }),
          (error) => assertValidationError(error, /createdBy/),
        );

        assert.equal(mockState.aggregateCalls.length, 0);
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
            ownerSearchClientRequestsService({
              queryInput: {},
              actorId: actorId.toString(),
              session: value,
            }),
          (error) => assertValidationError(error, "session must be an object"),
        );

        assert.equal(mockState.aggregateCalls.length, 0);
      });
    }

    test("validates session before other inputs when session is invalid", async () => {
      await assert.rejects(
        () =>
          ownerSearchClientRequestsService({
            queryInput: { status: "Open", page: "0" },
            actorId: "bad-id",
            session: "bad-session",
          }),
        (error) => assertValidationError(error, "session must be an object"),
      );

      assert.equal(mockState.aggregateCalls.length, 0);
    });

    for (const status of [
      "",
      "waiting",
      "WAITING",
      "Open",
      "closed",
      1,
      {},
      [],
    ]) {
      test(`rejects invalid status: ${JSON.stringify(status)}`, async () => {
        await assert.rejects(
          () =>
            ownerSearchClientRequestsService({
              queryInput: { status },
              actorId: actorId.toString(),
            }),
          (error) => assertValidationError(error),
        );

        assert.equal(mockState.aggregateCalls.length, 0);
      });
    }

    for (const [label, value] of [
      ["zero", "0"],
      ["negative", "-1"],
      ["too large", "10001"],
      ["decimal", "1.5"],
      ["non-numeric", "abc"],
    ]) {
      test(`rejects invalid page: ${label}`, async () => {
        await assert.rejects(
          () =>
            ownerSearchClientRequestsService({
              queryInput: { page: value },
              actorId: actorId.toString(),
            }),
          (error) => assertValidationError(error, /page/),
        );

        assert.equal(mockState.aggregateCalls.length, 0);
      });
    }

    for (const [label, value] of [
      ["zero", "0"],
      ["negative", "-1"],
      ["too large", "101"],
      ["decimal", "1.5"],
      ["non-numeric", "abc"],
    ]) {
      test(`rejects invalid limit: ${label}`, async () => {
        await assert.rejects(
          () =>
            ownerSearchClientRequestsService({
              queryInput: { limit: value },
              actorId: actorId.toString(),
            }),
          (error) => assertValidationError(error, /limit/),
        );

        assert.equal(mockState.aggregateCalls.length, 0);
      });
    }

    test("accepts page and limit at their boundaries", async () => {
      mockState.aggregateResult = [
        {
          data: [],
          pagination: { page: 10000, limit: 100, total: 0 },
        },
      ];

      await ownerSearchClientRequestsService({
        queryInput: { page: "10000", limit: "100" },
        actorId: actorId.toString(),
      });

      assert.deepEqual(getFacetData()[2], { $skip: 999_900 });
      assert.deepEqual(getFacetData()[3], { $limit: 100 });
    });
  });

  describe("persistence failures", () => {
    test("propagates aggregate failures", async () => {
      mockState.aggregateError = new Error("aggregate failed");

      await assert.rejects(
        () =>
          ownerSearchClientRequestsService({
            queryInput: {},
            actorId: actorId.toString(),
          }),
        (error) => {
          assert.equal(error.message, "aggregate failed");
          return true;
        },
      );

      assert.equal(mockState.aggregateCalls.length, 1);
    });
  });

  describe("query contract", () => {
    test("uses a single aggregate call", async () => {
      mockState.aggregateResult = emptyAggregateResult;

      await ownerSearchClientRequestsService({
        queryInput: {},
        actorId: actorId.toString(),
      });

      assert.equal(mockState.aggregateCalls.length, 1);
    });

    test("match always includes ownership, soft-delete, and status", async () => {
      mockState.aggregateResult = emptyAggregateResult;

      await ownerSearchClientRequestsService({
        queryInput: {},
        actorId: actorId.toString(),
      });

      assert.deepEqual(Object.keys(getMatch()).sort(), [
        "createdBy",
        "isDeleted",
        "status",
      ]);
    });
  });
});
