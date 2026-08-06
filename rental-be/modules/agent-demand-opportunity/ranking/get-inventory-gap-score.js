export const getInventoryGapScore = (count, policy) =>
  policy.inventoryGapBands.find((band) => count <= band.maximumCount)?.score ?? 0;
