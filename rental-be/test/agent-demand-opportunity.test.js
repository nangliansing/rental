import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  validateDemandOpportunityArea,
  validateSearchAgentDemandOpportunitiesBody,
} from "../modules/agent-demand-opportunity/agent-demand-opportunity.validation.js";
import { buildSearchAgentDemandOpportunitiesPipeline } from "../modules/agent-demand-opportunity/pipelines/build-search-agent-demand-opportunities.pipeline.js";
import { buildDemandOpportunityCoverage } from "../modules/agent-demand-opportunity/utils/build-demand-opportunity-coverage.js";

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

  test("requires strict pagination and rejects future or unknown fields", () => {
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
      {
        area: polygon,
        pagination: { page: 1, limit: 20 },
        matchStatus: "unmatched",
      },
    ]) {
      assert.throws(
        () => validateSearchAgentDemandOpportunitiesBody(body),
        (error) => error.statusCode === 422 && error.code === "VALIDATION_ERROR",
      );
    }
  });

  test("rejects unsafe or malformed geometry", () => {
    for (const area of [
      { type: "Point", coordinates: [181, 13], coverageMeters: 1000 },
      { type: "Point", coordinates: [100, 13], coverageMeters: 99 },
      {
        type: "Polygon",
        coordinates: [[[100, 13], [101, 13], [101, 14], [100, 14]]],
      },
      { ...polygon, coverageMeters: 1000 },
    ]) {
      assert.throws(() => validateDemandOpportunityArea(area));
    }
  });
});

test("demand opportunity pipeline uses the active geo match and safe projection", () => {
  const pipeline = buildSearchAgentDemandOpportunitiesPipeline({
    coverage: polygon,
    page: 2,
    limit: 10,
  });

  assert.deepEqual(pipeline[0], {
    $match: {
      status: "Waiting",
      isDeleted: false,
      "geoSearch.coverage": { $geoIntersects: { $geometry: polygon } },
    },
  });
  assert.equal(pipeline[1].$facet.data[1].$skip, 10);
  assert.equal(pipeline[1].$facet.data[2].$limit, 10);
  const projection = pipeline[1].$facet.data[3].$project;
  assert.equal(projection.createdBy, undefined);
  assert.equal(projection["geoSearch.coverage"], undefined);
});
