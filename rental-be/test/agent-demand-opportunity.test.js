import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  validateDemandOpportunityArea,
  validateSearchAgentDemandOpportunitiesBody,
} from "../modules/agent-demand-opportunity/agent-demand-opportunity.validation.js";
import { buildSearchAgentDemandOpportunityCandidatesPipeline } from "../modules/agent-demand-opportunity/pipelines/build-search-agent-demand-opportunity-candidates.pipeline.js";
import { buildMatchingBuildingClassificationsPipeline } from "../modules/agent-demand-opportunity/pipelines/build-matching-building-classifications.pipeline.js";
import { buildDemandOpportunityCoverage } from "../modules/agent-demand-opportunity/utils/build-demand-opportunity-coverage.js";
import { omitEmptyArrayFilters } from "../modules/agent-demand-opportunity/utils/omit-empty-array-filters.js";
import { mapWithConcurrency } from "../shared/utils/index.js";
import {
  calculateOpportunityRanking,
  compareRankedOpportunities,
  OPPORTUNITY_RANKING_POLICY,
  validateOpportunityRankingPolicy,
} from "../modules/agent-demand-opportunity/ranking/index.js";

const polygon = {
  type: "Polygon",
  coordinates: [[[100, 13], [101, 13], [101, 14], [100, 14], [100, 13]]],
};

describe("agent demand opportunity input", () => {
  test("accepts polygon, point, line, and multiline search areas", () => {
    assert.deepEqual(validateDemandOpportunityArea(polygon), polygon);

    for (const area of [
      { type: "Point", coordinates: [100.5, 13.7], coverageMeters: 1000 },
      {
        type: "LineString",
        coordinates: [[100.5, 13.7], [100.6, 13.8]],
        coverageMeters: 1000,
      },
      {
        type: "MultiLineString",
        coordinates: [[[100.5, 13.7], [100.6, 13.8]]],
        coverageMeters: 1000,
      },
    ]) {
      assert.deepEqual(validateDemandOpportunityArea(area), area);
      assert.match(
        buildDemandOpportunityCoverage(area).type,
        /^(Polygon|MultiPolygon)$/,
      );
    }
  });

  test("requires strict pagination and accepts only supported matchStatus values", () => {
    assert.deepEqual(
      validateSearchAgentDemandOpportunitiesBody({
        area: polygon,
        pagination: { page: 2, limit: 10 },
      }),
      { area: polygon, page: 2, limit: 10 },
    );

    for (const body of [
      { area: polygon },
      { area: polygon, pagination: {} },
      { area: polygon, pagination: { page: 1, limit: 20 }, unknown: true },
    ]) {
      assert.throws(
        () => validateSearchAgentDemandOpportunitiesBody(body),
        (error) => error.statusCode === 422 && error.code === "VALIDATION_ERROR",
      );
    }

    assert.equal(
      validateSearchAgentDemandOpportunitiesBody({
        area: polygon,
        pagination: { page: 1, limit: 20 },
        matchStatus: "unmatched",
      }).matchStatus,
      "unmatched",
    );
    assert.throws(() =>
      validateSearchAgentDemandOpportunitiesBody({
        area: polygon,
        pagination: { page: 1, limit: 20 },
        matchStatus: "future",
      }),
    );
  });

  test("rejects unsafe or malformed geometry", () => {
    for (const area of [
      { type: "Point", coordinates: [181, 13], coverageMeters: 1000 },
      { type: "Point", coordinates: [100, 13], coverageMeters: 99 },
      {
        type: "Polygon",
        coordinates: [[[100, 13], [101, 13], [101, 14], [100, 14]]],
      },
      {
        type: "Polygon",
        coordinates: [[
          [100, 13],
          [101, 14],
          [101, 13],
          [100, 14],
          [100, 13],
        ]],
      },
      {
        type: "Polygon",
        coordinates: [[
          [100.53, 13.73],
          [100.54, 13.74],
          [100.55, 13.75],
          [100.53, 13.73],
        ]],
      },
      {
        type: "Polygon",
        coordinates: [
          [[100, 13], [101, 13], [101, 14], [100, 14], [100, 13]],
          [[100.9, 13.2], [101.1, 13.2], [101.1, 13.4], [100.9, 13.4], [100.9, 13.2]],
        ],
      },
      { ...polygon, coverageMeters: 1000 },
    ]) {
      assert.throws(() => validateDemandOpportunityArea(area));
    }
  });
});

test("ranking policy and score calculation are deterministic and bounded", () => {
  assert.equal(validateOpportunityRankingPolicy(OPPORTUNITY_RANKING_POLICY), OPPORTUNITY_RANKING_POLICY);
  const now = new Date("2026-08-06T00:00:00.000Z");
  assert.deepEqual(
    calculateOpportunityRanking({
      hasCallerMatch: false,
      platformMatchingBuildingCount: 1,
      lastConfirmedAt: new Date("2026-08-04T00:00:00.000Z"),
      createdAt: now,
      now,
      policy: OPPORTUNITY_RANKING_POLICY,
    }),
    {
      score: 0.835,
      inventoryGapScore: 0.8,
      freshnessScore: 0.9,
      policyVersion: "v1",
    },
  );
  assert.equal(
    calculateOpportunityRanking({
      hasCallerMatch: true,
      platformMatchingBuildingCount: 0,
      lastConfirmedAt: now,
      createdAt: now,
      now,
      policy: OPPORTUNITY_RANKING_POLICY,
    }),
    null,
  );
});

test("ranking sort uses score, freshness, creation time, and id tie-breakers", () => {
  const opportunities = [
    { _id: "b", createdAt: "2026-08-01", lastConfirmedAt: "2026-08-02", opportunityRanking: { score: 0.8 } },
    { _id: "a", createdAt: "2026-08-01", lastConfirmedAt: "2026-08-02", opportunityRanking: { score: 0.8 } },
    { _id: "c", createdAt: "2026-08-01", lastConfirmedAt: "2026-08-03", opportunityRanking: { score: 0.8 } },
    { _id: "d", createdAt: "2026-08-01", lastConfirmedAt: "2026-08-01", opportunityRanking: { score: 0.9 } },
    { _id: "e", createdAt: "2026-08-04", lastConfirmedAt: "2026-08-04", opportunityRanking: null },
  ];
  assert.deepEqual(
    opportunities.sort(compareRankedOpportunities).map(({ _id }) => _id),
    ["d", "c", "a", "b", "e"],
  );
});

test("demand opportunity candidate pipeline uses active geo match and a hard guard", () => {
  const pipeline = buildSearchAgentDemandOpportunityCandidatesPipeline({
    coverage: polygon,
    maximumCandidates: 100,
  });

  assert.deepEqual(pipeline[0], {
    $match: {
      status: "Waiting",
      isDeleted: false,
      "geoSearch.coverage": { $geoIntersects: { $geometry: polygon } },
    },
  });
  assert.equal(pipeline[1].$limit, 101);
  assert.equal(pipeline[2].$project.name, undefined);
  assert.equal(pipeline[2].$project.createdBy, undefined);
  assert.equal(pipeline[2].$project.title, undefined);
  assert.equal(pipeline[2].$project.description, undefined);
  assert.equal(pipeline[2].$project.geoSearch, 1);
});

test("matching-building pipeline reuses canonical filters and bounds its work", () => {
  const pipeline = buildMatchingBuildingClassificationsPipeline({
    coverage: polygon,
    filters: {
      minRent: 15_000,
      maxRent: 30_000,
      bedroomCount: 1,
      buildingType: "Apartment",
      buildingFacilities: ["Lift"],
      security: ["CCTV"],
    },
    callerUserId: "caller-user-id",
    listedByUserIds: ["allowed-user-id"],
    maximumBuildings: 20,
  });

  assert.deepEqual(pipeline[0].$match, {
    isActive: true,
    buildingType: "Apartment",
    facilities: { $all: ["Lift"] },
    security: { $all: ["CCTV"] },
    location: { $geoWithin: { $geometry: polygon } },
  });

  const listingMatch = pipeline[1].$lookup.pipeline[0].$match;
  assert.deepEqual(listingMatch.rent, { $gte: 15_000, $lte: 30_000 });
  assert.deepEqual(listingMatch.bedroomCount, { $gte: 1 });
  assert.deepEqual(listingMatch.listedBy, { $in: ["allowed-user-id"] });
  assert.equal(pipeline[3].$limit, 21);
});

test("stored empty array filters are omitted without mutating SavedSearch data", () => {
  const filters = {
    minRent: 10_000,
    listingFacilities: [],
    buildingFacilities: [],
    security: [],
    supportLanguages: [],
    agentProfileIds: [],
  };

  assert.deepEqual(omitEmptyArrayFilters(filters), {
    minRent: 10_000,
    agentProfileIds: [],
  });
  assert.deepEqual(filters.listingFacilities, []);
});

test("bounded concurrency preserves order and never exceeds its limit", async () => {
  let active = 0;
  let peak = 0;
  const results = await mapWithConcurrency([3, 1, 2, 0], 2, async (value) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, value));
    active -= 1;
    return value * 10;
  });

  assert.deepEqual(results, [30, 10, 20, 0]);
  assert.equal(peak, 2);
  await assert.rejects(
    mapWithConcurrency([1], 3, async () => {
      throw new Error("enrichment failed");
    }),
    /enrichment failed/,
  );
});
