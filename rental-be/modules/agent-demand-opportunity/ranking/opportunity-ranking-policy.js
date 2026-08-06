export const OPPORTUNITY_RANKING_POLICY = Object.freeze({
  version: "v1",
  weights: Object.freeze({ inventoryGap: 0.65, freshness: 0.35 }),
  inventoryGapBands: Object.freeze([
    Object.freeze({ maximumCount: 0, score: 1 }),
    Object.freeze({ maximumCount: 1, score: 0.8 }),
    Object.freeze({ maximumCount: 3, score: 0.6 }),
    Object.freeze({ maximumCount: 5, score: 0.4 }),
    Object.freeze({ maximumCount: 10, score: 0.2 }),
    Object.freeze({ maximumCount: Number.POSITIVE_INFINITY, score: 0.1 }),
  ]),
  freshnessBands: Object.freeze([
    Object.freeze({ maximumAgeDays: 1, score: 1 }),
    Object.freeze({ maximumAgeDays: 3, score: 0.9 }),
    Object.freeze({ maximumAgeDays: 7, score: 0.7 }),
    Object.freeze({ maximumAgeDays: 14, score: 0.4 }),
    Object.freeze({ maximumAgeDays: 21, score: 0.2 }),
    Object.freeze({ maximumAgeDays: Number.POSITIVE_INFINITY, score: 0.05 }),
  ]),
});
