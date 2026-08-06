/**
 * Explicit allowlist for agent-facing demand opportunity rows.
 * Owner-private fields (name, description/note, creator) stay excluded
 * even if a candidate document somehow contains them.
 */
export const toPublicAgentDemandOpportunity = (opportunity) => {
  const {
    _id,
    status,
    filters,
    geoSearch,
    createdAt,
    updatedAt,
    lastConfirmedAt,
    myMatchingBuildingCount,
    platformMatchingBuildingCount,
    matchingBuildingCountCapped,
    opportunityRanking,
  } = opportunity;

  const { coverage: _coverage, ...safeGeoSearch } =
    geoSearch && typeof geoSearch === "object" ? geoSearch : {};

  const publicOpportunity = {
    _id,
    status,
    filters,
    geoSearch: safeGeoSearch,
    createdAt,
    updatedAt,
  };

  if (lastConfirmedAt !== undefined) {
    publicOpportunity.lastConfirmedAt = lastConfirmedAt;
  }

  if (myMatchingBuildingCount !== undefined) {
    publicOpportunity.myMatchingBuildingCount = myMatchingBuildingCount;
  }

  if (platformMatchingBuildingCount !== undefined) {
    publicOpportunity.platformMatchingBuildingCount =
      platformMatchingBuildingCount;
  }

  if (matchingBuildingCountCapped !== undefined) {
    publicOpportunity.matchingBuildingCountCapped =
      matchingBuildingCountCapped;
  }

  if (opportunityRanking !== undefined) {
    publicOpportunity.opportunityRanking = opportunityRanking;
  }

  return publicOpportunity;
};
