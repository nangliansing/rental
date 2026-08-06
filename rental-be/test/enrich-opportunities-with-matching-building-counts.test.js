import assert from "node:assert/strict";
import { afterEach, describe, mock, test } from "node:test";

import mongoose from "mongoose";

const mockState = {
  countCalls: [],
};

mock.module(
  "../modules/agent-demand-opportunity/services/count-matching-buildings-for-opportunity.service.js",
  {
    namedExports: {
      countMatchingBuildingsForOpportunity: async (options) => {
        mockState.countCalls.push(options);
        return {
          myMatchingBuildingCount: 2,
          platformMatchingBuildingCount: 5,
          matchingBuildingCountCapped: false,
        };
      },
    },
  },
);

mock.module(
  "../modules/agent-demand-opportunity/utils/resolve-opportunity-agent-user-ids.js",
  {
    namedExports: {
      resolveOpportunityAgentUserIds: async () => new Map(),
      getOpportunityListedByUserIds: () => [],
    },
  },
);

const { enrichOpportunitiesWithMatchingBuildingCounts } = await import(
  "../modules/agent-demand-opportunity/services/enrich-opportunities-with-matching-building-counts.service.js"
);

afterEach(() => {
  mockState.countCalls = [];
});

describe("enrichOpportunitiesWithMatchingBuildingCounts", () => {
  test("preserves owner fields while stripping internal ranking/geo coverage", async () => {
    const callerUserId = new mongoose.Types.ObjectId();
    const createdBy = new mongoose.Types.ObjectId();

    const [enriched] = await enrichOpportunitiesWithMatchingBuildingCounts({
      opportunities: [
        {
          _id: new mongoose.Types.ObjectId(),
          createdBy,
          name: "Owner visible name",
          description: "Owner note",
          status: "Waiting",
          hasCallerMatch: true,
          geoSearch: {
            mode: "area",
            placeName: "Siam",
            coverage: { type: "Polygon", coordinates: [] },
          },
          filters: { bedroomCount: 1 },
          createdAt: new Date("2026-08-04T07:30:00.000Z"),
          updatedAt: new Date("2026-08-06T07:30:00.000Z"),
        },
      ],
      callerUserId,
    });

    assert.equal(enriched.name, "Owner visible name");
    assert.equal(String(enriched.createdBy), createdBy.toString());
    assert.equal(enriched.description, "Owner note");
    assert.equal(enriched.hasCallerMatch, undefined);
    assert.equal(enriched.geoSearch.coverage, undefined);
    assert.equal(enriched.geoSearch.placeName, "Siam");
    assert.equal(enriched.myMatchingBuildingCount, 2);
    assert.equal(enriched.platformMatchingBuildingCount, 5);
    assert.equal(enriched.matchingBuildingCountCapped, false);
  });
});
