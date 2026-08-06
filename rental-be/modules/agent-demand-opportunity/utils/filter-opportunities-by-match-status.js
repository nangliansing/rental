import { DEMAND_OPPORTUNITY_MATCH_STATUSES } from "../agent-demand-opportunity.constants.js";

export const filterOpportunitiesByMatchStatus = (opportunities, matchStatus) => {
  if (matchStatus === DEMAND_OPPORTUNITY_MATCH_STATUSES.MATCHED) {
    return opportunities.filter(({ hasCallerMatch }) => hasCallerMatch);
  }
  if (matchStatus === DEMAND_OPPORTUNITY_MATCH_STATUSES.UNMATCHED) {
    return opportunities.filter(({ hasCallerMatch }) => !hasCallerMatch);
  }
  return opportunities;
};
