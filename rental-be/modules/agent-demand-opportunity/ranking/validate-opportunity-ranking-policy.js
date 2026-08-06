export const validateOpportunityRankingPolicy = (policy) => {
  if (
    !Number.isFinite(policy.weights.inventoryGap) ||
    !Number.isFinite(policy.weights.freshness) ||
    policy.weights.inventoryGap < 0 ||
    policy.weights.freshness < 0
  ) {
    throw new Error("Opportunity ranking weights must be non-negative numbers");
  }
  const weightTotal = policy.weights.inventoryGap + policy.weights.freshness;
  if (Math.abs(weightTotal - 1) > Number.EPSILON) {
    throw new Error("Opportunity ranking weights must total 1");
  }

  for (const band of [
    ...policy.inventoryGapBands,
    ...policy.freshnessBands,
  ]) {
    if (!Number.isFinite(band.score) || band.score < 0 || band.score > 1) {
      throw new Error("Opportunity ranking band scores must be between 0 and 1");
    }
  }

  for (const [bands, limitField] of [
    [policy.inventoryGapBands, "maximumCount"],
    [policy.freshnessBands, "maximumAgeDays"],
  ]) {
    const limits = bands.map((band) => band[limitField]);
    if (
      bands.length === 0 ||
      limits.some(
        (limit, index) => index > 0 && limit <= limits[index - 1],
      )
    ) {
      throw new Error("Opportunity ranking bands must have increasing limits");
    }
  }

  return policy;
};
