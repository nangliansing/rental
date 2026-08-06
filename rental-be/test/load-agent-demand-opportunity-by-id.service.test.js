import assert from "node:assert/strict";
import { afterEach, describe, mock, test } from "node:test";

import mongoose from "mongoose";

import { AppError } from "../shared/errors/app-error.js";
import { SAVED_SEARCH_STATUSES } from "../modules/saved-search/saved-search.constants.js";
import { throwAgentDemandOpportunityNotFound } from "../modules/agent-demand-opportunity/utils/throw-agent-demand-opportunity-not-found.js";

const opportunityId = new mongoose.Types.ObjectId();

const existingDocument = {
  _id: opportunityId,
  createdBy: new mongoose.Types.ObjectId(),
  name: "Private name",
  description: "Private note",
  status: SAVED_SEARCH_STATUSES.WAITING,
  geoSearch: {
    mode: "area",
    placeName: "Siam",
    coverage: {
      type: "Polygon",
      coordinates: [
        [
          [100.62, 13.75],
          [100.66, 13.75],
          [100.66, 13.78],
          [100.62, 13.78],
          [100.62, 13.75],
        ],
      ],
    },
  },
  filters: { minRent: 15_000, bedroomCount: 1 },
  isDeleted: false,
  deletedAt: null,
  createdAt: new Date("2026-08-04T07:30:00.000Z"),
  updatedAt: new Date("2026-08-06T07:30:00.000Z"),
  lastConfirmedAt: new Date("2026-08-04T07:30:00.000Z"),
};

const mockState = {
  findOneResult: null,
  findOneError: null,
  findOneCalls: [],
};

const createChain = (result) => {
  const query = {
    usedSession: undefined,
    selectArgs: undefined,
    leanCalled: false,
    select(args) {
      query.selectArgs = args;
      return query;
    },
    lean() {
      query.leanCalled = true;
      return query;
    },
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

mock.module("../modules/saved-search/saved-search.model.js", {
  defaultExport: {
    findOne: (filter) => {
      const query = createChain(mockState.findOneResult);
      mockState.findOneCalls.push({ filter, query });
      return query;
    },
  },
});

const { loadAgentDemandOpportunityByIdService } = await import(
  "../modules/agent-demand-opportunity/services/load-agent-demand-opportunity-by-id.service.js"
);

const resetMockState = () => {
  mockState.findOneResult = null;
  mockState.findOneError = null;
  mockState.findOneCalls = [];
};

const assertNotFoundError = (error) => {
  assert.equal(error instanceof AppError, true);
  assert.equal(error.statusCode, 404);
  assert.equal(error.code, "AGENT_DEMAND_OPPORTUNITY_NOT_FOUND");
  assert.equal(error.message, "Agent demand opportunity not found");
  return true;
};

afterEach(() => {
  resetMockState();
});

describe("throwAgentDemandOpportunityNotFound", () => {
  test("throws a stable 404 AppError", () => {
    assert.throws(() => throwAgentDemandOpportunityNotFound(), assertNotFoundError);
  });
});

describe("loadAgentDemandOpportunityByIdService", () => {
  describe("successful fetch", () => {
    test("returns the lean Waiting document when the eligibility filter matches", async () => {
      mockState.findOneResult = existingDocument;

      const result = await loadAgentDemandOpportunityByIdService({
        opportunityId: opportunityId.toString(),
        session: null,
      });

      assert.equal(mockState.findOneCalls.length, 1);
      assert.deepEqual(mockState.findOneCalls[0].filter, {
        _id: opportunityId.toString(),
        status: SAVED_SEARCH_STATUSES.WAITING,
        isDeleted: false,
      });
      assert.equal(
        mockState.findOneCalls[0].query.selectArgs,
        "+geoSearch.coverage",
      );
      assert.equal(mockState.findOneCalls[0].query.leanCalled, true);
      assert.equal(mockState.findOneCalls[0].query.usedSession, undefined);
      assert.equal(result === existingDocument, true);
      assert.equal(result.name, "Private name");
      assert.ok(result.geoSearch.coverage);
    });

    test("accepts ObjectId opportunityId without rewriting the filter id", async () => {
      mockState.findOneResult = existingDocument;

      await loadAgentDemandOpportunityByIdService({
        opportunityId,
      });

      assert.deepEqual(mockState.findOneCalls[0].filter, {
        _id: opportunityId,
        status: SAVED_SEARCH_STATUSES.WAITING,
        isDeleted: false,
      });
    });

    test("defaults session to null when omitted and does not attach one", async () => {
      mockState.findOneResult = existingDocument;

      await loadAgentDemandOpportunityByIdService({
        opportunityId: opportunityId.toString(),
      });

      assert.equal(mockState.findOneCalls[0].query.usedSession, undefined);
    });

    test("does not attach session when session is explicitly null", async () => {
      mockState.findOneResult = existingDocument;

      await loadAgentDemandOpportunityByIdService({
        opportunityId: opportunityId.toString(),
        session: null,
      });

      assert.equal(mockState.findOneCalls[0].query.usedSession, undefined);
    });

    test("attaches a valid session after select/lean", async () => {
      const session = { id: "fake-mongoose-session" };
      mockState.findOneResult = existingDocument;

      await loadAgentDemandOpportunityByIdService({
        opportunityId: opportunityId.toString(),
        session,
      });

      assert.equal(mockState.findOneCalls[0].query.usedSession, session);
      assert.equal(
        mockState.findOneCalls[0].query.selectArgs,
        "+geoSearch.coverage",
      );
      assert.equal(mockState.findOneCalls[0].query.leanCalled, true);
    });

    test("eligibility filter never includes ownership or deletedAt", async () => {
      mockState.findOneResult = existingDocument;

      await loadAgentDemandOpportunityByIdService({
        opportunityId: opportunityId.toString(),
      });

      assert.deepEqual(Object.keys(mockState.findOneCalls[0].filter).sort(), [
        "_id",
        "isDeleted",
        "status",
      ]);
      assert.equal(
        Object.hasOwn(mockState.findOneCalls[0].filter, "createdBy"),
        false,
      );
      assert.equal(
        Object.hasOwn(mockState.findOneCalls[0].filter, "deletedAt"),
        false,
      );
    });
  });

  describe("not found / eligibility collapse", () => {
    test("throws AGENT_DEMAND_OPPORTUNITY_NOT_FOUND when findOne returns null", async () => {
      mockState.findOneResult = null;

      await assert.rejects(
        () =>
          loadAgentDemandOpportunityByIdService({
            opportunityId: opportunityId.toString(),
          }),
        assertNotFoundError,
      );

      assert.equal(mockState.findOneCalls.length, 1);
      assert.deepEqual(mockState.findOneCalls[0].filter, {
        _id: opportunityId.toString(),
        status: SAVED_SEARCH_STATUSES.WAITING,
        isDeleted: false,
      });
    });

    test("uses Waiting + soft-delete guard so Closed/deleted collapse to not found at the query layer", async () => {
      mockState.findOneResult = null;

      await assert.rejects(
        () =>
          loadAgentDemandOpportunityByIdService({
            opportunityId: opportunityId.toString(),
          }),
        assertNotFoundError,
      );

      assert.equal(
        mockState.findOneCalls[0].filter.status,
        SAVED_SEARCH_STATUSES.WAITING,
      );
      assert.equal(mockState.findOneCalls[0].filter.isDeleted, false);
    });
  });

  describe("database failures", () => {
    test("propagates underlying findOne errors without remapping", async () => {
      const databaseError = new Error("mongo boom");
      mockState.findOneError = databaseError;

      await assert.rejects(
        () =>
          loadAgentDemandOpportunityByIdService({
            opportunityId: opportunityId.toString(),
          }),
        (error) => {
          assert.equal(error, databaseError);
          return true;
        },
      );
    });
  });
});
