import { mapWithConcurrency } from "../../../shared/utils/index.js";
import {
  DEMAND_OPPORTUNITY_ENRICHMENT_CONCURRENCY,
  DEMAND_OPPORTUNITY_RANKING_INVENTORY_LIMIT,
} from "../agent-demand-opportunity.constants.js";
import {
  calculateOpportunityRanking,
  OPPORTUNITY_RANKING_POLICY,
} from "../ranking/index.js";
import { getOpportunityListedByUserIds } from "../utils/resolve-opportunity-agent-user-ids.js";
import { countMatchingBuildingsForOpportunity } from "./count-matching-buildings-for-opportunity.service.js";
import { hasCallerMatchingBuilding } from "./has-caller-matching-building.service.js";

export const rankAgentDemandOpportunities = ({
  opportunities,
  callerUserId,
  agentUserIdsByProfileId,
  now,
  session = null,
}) =>
  mapWithConcurrency(
    opportunities,
    DEMAND_OPPORTUNITY_ENRICHMENT_CONCURRENCY,
    async (opportunity) => {
      const listedByUserIds = getOpportunityListedByUserIds(
        opportunity,
        agentUserIdsByProfileId,
      );
      const hasCallerMatch = await hasCallerMatchingBuilding({
        opportunity,
        callerUserId,
        listedByUserIds,
        session,
      });
      let platformMatchingBuildingCount = 0;

      if (!hasCallerMatch) {
        const counts = await countMatchingBuildingsForOpportunity({
          opportunity,
          callerUserId,
          listedByUserIds,
          maximumBuildings: DEMAND_OPPORTUNITY_RANKING_INVENTORY_LIMIT,
          session,
        });
        platformMatchingBuildingCount = counts.platformMatchingBuildingCount;
      }

      return {
        ...opportunity,
        hasCallerMatch,
        opportunityRanking: calculateOpportunityRanking({
          hasCallerMatch,
          platformMatchingBuildingCount,
          lastConfirmedAt: opportunity.lastConfirmedAt,
          createdAt: opportunity.createdAt,
          now,
          policy: OPPORTUNITY_RANKING_POLICY,
        }),
      };
    },
  );
