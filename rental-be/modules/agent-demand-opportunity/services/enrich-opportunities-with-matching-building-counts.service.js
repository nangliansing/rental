import { mapWithConcurrency } from "../../../shared/utils/index.js";
import {
  DEMAND_OPPORTUNITY_ENRICHMENT_CONCURRENCY,
  DEMAND_OPPORTUNITY_MATCHING_BUILDING_LIMIT,
} from "../agent-demand-opportunity.constants.js";
import {
  getOpportunityListedByUserIds,
  resolveOpportunityAgentUserIds,
} from "../utils/resolve-opportunity-agent-user-ids.js";
import { countMatchingBuildingsForOpportunity } from "./count-matching-buildings-for-opportunity.service.js";

/**
 * Adds matching-building counts and strips internal ranking/geo fields.
 * Does not strip owner fields (name, createdBy, …) — callers that need a
 * public allowlist should map with `toPublicAgentDemandOpportunity`.
 */
const omitInternalOpportunityFields = (opportunity) => {
  const { hasCallerMatch: _hasCallerMatch, ...rest } = opportunity;
  const geoSearch = rest.geoSearch;

  if (!geoSearch || typeof geoSearch !== "object") {
    return rest;
  }

  const { coverage: _coverage, ...safeGeoSearch } = geoSearch;
  return { ...rest, geoSearch: safeGeoSearch };
};

export const enrichOpportunitiesWithMatchingBuildingCounts = async ({
  opportunities,
  callerUserId,
  agentUserIdsByProfileId: suppliedAgentUserIdsByProfileId = null,
  session = null,
}) => {
  if (opportunities.length === 0) return [];

  const agentUserIdsByProfileId =
    suppliedAgentUserIdsByProfileId ??
    (await resolveOpportunityAgentUserIds({ opportunities, session }));

  return mapWithConcurrency(
    opportunities,
    DEMAND_OPPORTUNITY_ENRICHMENT_CONCURRENCY,
    async (opportunity) => {
      const counts = await countMatchingBuildingsForOpportunity({
        opportunity,
        callerUserId,
        listedByUserIds: getOpportunityListedByUserIds(
          opportunity,
          agentUserIdsByProfileId,
        ),
        maximumBuildings: DEMAND_OPPORTUNITY_MATCHING_BUILDING_LIMIT,
        session,
      });

      return {
        ...omitInternalOpportunityFields(opportunity),
        ...counts,
      };
    },
  );
};
