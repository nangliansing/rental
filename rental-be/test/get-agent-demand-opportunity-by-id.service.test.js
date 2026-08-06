import assert from "node:assert/strict";
import { afterEach, describe, mock, test } from "node:test";

import mongoose from "mongoose";

import { AppError } from "../shared/errors/app-error.js";
import { validateAgentDemandOpportunityId } from "../modules/agent-demand-opportunity/agent-demand-opportunity.validation.js";

const opportunityId = new mongoose.Types.ObjectId();
const callerUserId = new mongoose.Types.ObjectId();

const rawOpportunity = {
  _id: opportunityId.toString(),
  name: "Private name",
  description: "Private note",
  createdBy: new mongoose.Types.ObjectId().toString(),
  title: "Legacy title",
  isDeleted: false,
  deletedAt: null,
  status: "Waiting",
  filters: { bedroomCount: 1, minRent: 15_000 },
  geoSearch: {
    mode: "area",
    placeName: "Siam",
    coverage: { type: "Polygon", coordinates: [] },
  },
  createdAt: "2026-08-04T07:30:00.000Z",
  updatedAt: "2026-08-06T07:30:00.000Z",
  lastConfirmedAt: "2026-08-04T07:30:00.000Z",
};

const mockState = {
  loadCalls: [],
  loadResult: null,
  loadError: null,
  enrichCalls: [],
  enrichResult: null,
  enrichError: null,
};

mock.module(
  "../modules/agent-demand-opportunity/services/load-agent-demand-opportunity-by-id.service.js",
  {
    namedExports: {
      loadAgentDemandOpportunityByIdService: async (options) => {
        mockState.loadCalls.push(options);
        if (mockState.loadError) throw mockState.loadError;
        return mockState.loadResult;
      },
    },
  },
);

mock.module(
  "../modules/agent-demand-opportunity/services/enrich-opportunities-with-matching-building-counts.service.js",
  {
    namedExports: {
      enrichOpportunitiesWithMatchingBuildingCounts: async (options) => {
        mockState.enrichCalls.push(options);
        if (mockState.enrichError) throw mockState.enrichError;
        return mockState.enrichResult ?? options.opportunities;
      },
    },
  },
);

const { getAgentDemandOpportunityByIdService } = await import(
  "../modules/agent-demand-opportunity/services/get-agent-demand-opportunity-by-id.service.js"
);

const resetMockState = () => {
  mockState.loadCalls = [];
  mockState.loadResult = null;
  mockState.loadError = null;
  mockState.enrichCalls = [];
  mockState.enrichResult = null;
  mockState.enrichError = null;
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
  assert.equal(error.code, "AGENT_DEMAND_OPPORTUNITY_NOT_FOUND");
  return true;
};

const withEnrichedCounts = (opportunity, counts = {}) => [
  {
    ...opportunity,
    myMatchingBuildingCount: 0,
    platformMatchingBuildingCount: 0,
    matchingBuildingCountCapped: false,
    ...counts,
  },
];

afterEach(() => {
  resetMockState();
});

describe("validateAgentDemandOpportunityId", () => {
  test("accepts a valid ObjectId string", () => {
    const id = opportunityId.toString();
    assert.equal(validateAgentDemandOpportunityId(id), id);
  });

  test("trims whitespace around a valid ObjectId", () => {
    const id = opportunityId.toString();
    assert.equal(validateAgentDemandOpportunityId(`  ${id}  `), id);
  });

  test("accepts an ObjectId instance as a normalized string", () => {
    assert.equal(
      validateAgentDemandOpportunityId(opportunityId),
      opportunityId.toString(),
    );
  });

  for (const [label, value] of [
    ["null", null],
    ["undefined", undefined],
    ["empty string", ""],
    ["whitespace", "   "],
    ["non-hex string", "not-an-object-id"],
    ["too short hex", "abc123"],
    ["too long hex", `${opportunityId.toString()}a`],
    ["invalid 24-char hex", "zzzzzzzzzzzzzzzzzzzzzzzz"],
    ["number", 123],
    ["boolean", false],
    ["object", {}],
    ["array", []],
  ]) {
    test(`rejects invalid opportunityId: ${label}`, () => {
      assert.throws(
        () => validateAgentDemandOpportunityId(value),
        (error) => assertValidationError(error, /opportunityId/),
      );
    });
  }
});

describe("getAgentDemandOpportunityByIdService", () => {
  describe("successful orchestration", () => {
    test("loads, enriches, and allowlists a public opportunity", async () => {
      mockState.loadResult = rawOpportunity;
      mockState.enrichResult = withEnrichedCounts(rawOpportunity, {
        myMatchingBuildingCount: 1,
        platformMatchingBuildingCount: 3,
        matchingBuildingCountCapped: false,
      });

      const result = await getAgentDemandOpportunityByIdService({
        opportunityId: opportunityId.toString(),
        callerUserId,
      });

      assert.deepEqual(mockState.loadCalls, [
        { opportunityId: opportunityId.toString(), session: null },
      ]);
      assert.equal(mockState.enrichCalls.length, 1);
      assert.equal(mockState.enrichCalls[0].opportunities[0], rawOpportunity);
      assert.equal(mockState.enrichCalls[0].session, null);
      assert.equal(
        String(mockState.enrichCalls[0].callerUserId),
        callerUserId.toString(),
      );
      assert.equal(
        mockState.enrichCalls[0].callerUserId instanceof mongoose.Types.ObjectId,
        true,
      );

      assert.deepEqual(result, {
        _id: opportunityId.toString(),
        status: "Waiting",
        filters: { bedroomCount: 1, minRent: 15_000 },
        geoSearch: {
          mode: "area",
          placeName: "Siam",
        },
        createdAt: "2026-08-04T07:30:00.000Z",
        updatedAt: "2026-08-06T07:30:00.000Z",
        lastConfirmedAt: "2026-08-04T07:30:00.000Z",
        myMatchingBuildingCount: 1,
        platformMatchingBuildingCount: 3,
        matchingBuildingCountCapped: false,
      });
      assert.equal(result.name, undefined);
      assert.equal(result.description, undefined);
      assert.equal(result.createdBy, undefined);
      assert.equal(result.title, undefined);
      assert.equal(result.isDeleted, undefined);
      assert.equal(result.deletedAt, undefined);
      assert.equal(result.geoSearch.coverage, undefined);
      assert.equal(result.opportunityRanking, undefined);
    });

    test("forwards an explicit session to load and enrich", async () => {
      const session = { id: "fake-mongoose-session" };
      mockState.loadResult = rawOpportunity;
      mockState.enrichResult = withEnrichedCounts(rawOpportunity);

      await getAgentDemandOpportunityByIdService({
        opportunityId: opportunityId.toString(),
        callerUserId,
        session,
      });

      assert.equal(mockState.loadCalls[0].session, session);
      assert.equal(mockState.enrichCalls[0].session, session);
    });

    test("defaults session to null when omitted", async () => {
      mockState.loadResult = rawOpportunity;
      mockState.enrichResult = withEnrichedCounts(rawOpportunity);

      await getAgentDemandOpportunityByIdService({
        opportunityId: opportunityId.toString(),
        callerUserId,
      });

      assert.equal(mockState.loadCalls[0].session, null);
      assert.equal(mockState.enrichCalls[0].session, null);
    });

    test("accepts ObjectId opportunityId and still loads with the validated string id", async () => {
      mockState.loadResult = rawOpportunity;
      mockState.enrichResult = withEnrichedCounts(rawOpportunity);

      await getAgentDemandOpportunityByIdService({
        opportunityId,
        callerUserId,
      });

      assert.deepEqual(mockState.loadCalls[0], {
        opportunityId: opportunityId.toString(),
        session: null,
      });
    });

    test("normalizes string callerUserId to ObjectId before enrich", async () => {
      mockState.loadResult = rawOpportunity;
      mockState.enrichResult = withEnrichedCounts(rawOpportunity);

      await getAgentDemandOpportunityByIdService({
        opportunityId: opportunityId.toString(),
        callerUserId: callerUserId.toString(),
      });

      assert.equal(
        mockState.enrichCalls[0].callerUserId instanceof mongoose.Types.ObjectId,
        true,
      );
      assert.equal(
        String(mockState.enrichCalls[0].callerUserId),
        callerUserId.toString(),
      );
    });

    test("omits lastConfirmedAt when enrich does not provide it", async () => {
      const withoutLastConfirmed = { ...rawOpportunity };
      delete withoutLastConfirmed.lastConfirmedAt;

      mockState.loadResult = withoutLastConfirmed;
      mockState.enrichResult = withEnrichedCounts(withoutLastConfirmed);

      const result = await getAgentDemandOpportunityByIdService({
        opportunityId: opportunityId.toString(),
        callerUserId,
      });

      assert.equal(Object.hasOwn(result, "lastConfirmedAt"), false);
    });

    test("does not invent opportunityRanking when enrich omits it", async () => {
      mockState.loadResult = rawOpportunity;
      mockState.enrichResult = withEnrichedCounts(rawOpportunity);

      const result = await getAgentDemandOpportunityByIdService({
        opportunityId: opportunityId.toString(),
        callerUserId,
      });

      assert.equal(result.opportunityRanking, undefined);
      assert.equal(Object.hasOwn(mockState.enrichCalls[0], "rank"), false);
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
      ["too long hex", `${opportunityId.toString()}a`],
      ["invalid 24-char hex", "zzzzzzzzzzzzzzzzzzzzzzzz"],
      ["number", 123],
      ["boolean", false],
      ["object", {}],
      ["array", []],
    ]) {
      test(`rejects invalid opportunityId before loading: ${label}`, async () => {
        await assert.rejects(
          () =>
            getAgentDemandOpportunityByIdService({
              opportunityId: value,
              callerUserId,
            }),
          (error) => assertValidationError(error, /opportunityId/),
        );

        assert.equal(mockState.loadCalls.length, 0);
        assert.equal(mockState.enrichCalls.length, 0);
      });

      test(`rejects invalid callerUserId before loading: ${label}`, async () => {
        await assert.rejects(
          () =>
            getAgentDemandOpportunityByIdService({
              opportunityId: opportunityId.toString(),
              callerUserId: value,
            }),
          (error) => assertValidationError(error, /callerUserId/),
        );

        assert.equal(mockState.loadCalls.length, 0);
        assert.equal(mockState.enrichCalls.length, 0);
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
            getAgentDemandOpportunityByIdService({
              opportunityId: opportunityId.toString(),
              callerUserId,
              session: value,
            }),
          (error) => assertValidationError(error, "session must be an object"),
        );

        assert.equal(mockState.loadCalls.length, 0);
        assert.equal(mockState.enrichCalls.length, 0);
      });
    }

    test("validates session before ids when session is invalid", async () => {
      await assert.rejects(
        () =>
          getAgentDemandOpportunityByIdService({
            opportunityId: "bad-id",
            callerUserId: "bad-id",
            session: "bad-session",
          }),
        (error) => assertValidationError(error, "session must be an object"),
      );

      assert.equal(mockState.loadCalls.length, 0);
    });

    test("rejects missing opportunityId before querying", async () => {
      await assert.rejects(
        () =>
          getAgentDemandOpportunityByIdService({
            callerUserId,
          }),
        (error) => assertValidationError(error, /opportunityId/),
      );

      assert.equal(mockState.loadCalls.length, 0);
    });

    test("rejects missing callerUserId before querying", async () => {
      await assert.rejects(
        () =>
          getAgentDemandOpportunityByIdService({
            opportunityId: opportunityId.toString(),
          }),
        (error) => assertValidationError(error, /callerUserId/),
      );

      assert.equal(mockState.loadCalls.length, 0);
    });
  });

  describe("dependency failures", () => {
    test("propagates not-found from load and never enriches", async () => {
      mockState.loadError = new AppError(
        "Agent demand opportunity not found",
        404,
        "AGENT_DEMAND_OPPORTUNITY_NOT_FOUND",
      );

      await assert.rejects(
        () =>
          getAgentDemandOpportunityByIdService({
            opportunityId: opportunityId.toString(),
            callerUserId,
          }),
        assertNotFoundError,
      );

      assert.equal(mockState.loadCalls.length, 1);
      assert.equal(mockState.enrichCalls.length, 0);
    });

    test("propagates unexpected load errors and never enriches", async () => {
      const loadError = new Error("load failed");
      mockState.loadError = loadError;

      await assert.rejects(
        () =>
          getAgentDemandOpportunityByIdService({
            opportunityId: opportunityId.toString(),
            callerUserId,
          }),
        (error) => {
          assert.equal(error, loadError);
          assert.equal(mockState.enrichCalls.length, 0);
          return true;
        },
      );
    });

    test("propagates enrich failures after a successful load", async () => {
      const enrichError = new Error("enrich failed");
      mockState.loadResult = rawOpportunity;
      mockState.enrichError = enrichError;

      await assert.rejects(
        () =>
          getAgentDemandOpportunityByIdService({
            opportunityId: opportunityId.toString(),
            callerUserId,
          }),
        (error) => {
          assert.equal(error, enrichError);
          assert.equal(mockState.loadCalls.length, 1);
          assert.equal(mockState.enrichCalls.length, 1);
          return true;
        },
      );
    });

    test("does not leak private fields when enrich returns owner fields", async () => {
      mockState.loadResult = rawOpportunity;
      mockState.enrichResult = [
        {
          ...rawOpportunity,
          myMatchingBuildingCount: 2,
          platformMatchingBuildingCount: 4,
          matchingBuildingCountCapped: true,
          hasCallerMatch: true,
        },
      ];

      const result = await getAgentDemandOpportunityByIdService({
        opportunityId: opportunityId.toString(),
        callerUserId,
      });

      assert.equal(result.name, undefined);
      assert.equal(result.description, undefined);
      assert.equal(result.createdBy, undefined);
      assert.equal(result.hasCallerMatch, undefined);
      assert.equal(result.matchingBuildingCountCapped, true);
      assert.equal(result.myMatchingBuildingCount, 2);
      assert.equal(result.platformMatchingBuildingCount, 4);
    });
  });
});
