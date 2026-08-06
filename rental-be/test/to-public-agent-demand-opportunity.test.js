import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { toPublicAgentDemandOpportunity } from "../modules/agent-demand-opportunity/mappers/to-public-agent-demand-opportunity.js";

describe("toPublicAgentDemandOpportunity", () => {
  test("allowlists public fields and strips owner-private data", () => {
    const publicOpportunity = toPublicAgentDemandOpportunity({
      _id: "opportunity-1",
      name: "Private name",
      description: "Private note",
      title: "Legacy title",
      createdBy: "user-1",
      isDeleted: false,
      deletedAt: null,
      hasCallerMatch: true,
      status: "Waiting",
      filters: { bedroomCount: 1 },
      geoSearch: {
        mode: "area",
        placeName: "Siam",
        coverage: { type: "Polygon", coordinates: [] },
      },
      createdAt: "2026-08-04T07:30:00.000Z",
      updatedAt: "2026-08-06T07:30:00.000Z",
      lastConfirmedAt: "2026-08-04T07:30:00.000Z",
      opportunityRanking: {
        score: 0.8,
        inventoryGapScore: 0.7,
        freshnessScore: 0.9,
        policyVersion: "v1",
      },
    });

    assert.deepEqual(publicOpportunity, {
      _id: "opportunity-1",
      status: "Waiting",
      filters: { bedroomCount: 1 },
      geoSearch: {
        mode: "area",
        placeName: "Siam",
      },
      createdAt: "2026-08-04T07:30:00.000Z",
      updatedAt: "2026-08-06T07:30:00.000Z",
      lastConfirmedAt: "2026-08-04T07:30:00.000Z",
      opportunityRanking: {
        score: 0.8,
        inventoryGapScore: 0.7,
        freshnessScore: 0.9,
        policyVersion: "v1",
      },
    });
    assert.equal(publicOpportunity.name, undefined);
    assert.equal(publicOpportunity.description, undefined);
    assert.equal(publicOpportunity.createdBy, undefined);
  });
});
