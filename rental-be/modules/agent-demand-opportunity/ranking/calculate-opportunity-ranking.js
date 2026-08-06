import { getFreshnessScore } from "./get-freshness-score.js";
import { getInventoryGapScore } from "./get-inventory-gap-score.js";

const roundScore = (score) => Math.round(score * 1_000_000) / 1_000_000;

export const calculateOpportunityRanking = ({
  hasCallerMatch,
  platformMatchingBuildingCount,
  lastConfirmedAt,
  createdAt,
  now,
  policy,
}) => {
  if (hasCallerMatch) return null;

  const inventoryGapScore = getInventoryGapScore(
    platformMatchingBuildingCount,
    policy,
  );
  const freshnessScore = getFreshnessScore(
    lastConfirmedAt ?? createdAt,
    now,
    policy,
  );
  const score = roundScore(
    inventoryGapScore * policy.weights.inventoryGap +
      freshnessScore * policy.weights.freshness,
  );

  return {
    score,
    inventoryGapScore,
    freshnessScore,
    policyVersion: policy.version,
  };
};
