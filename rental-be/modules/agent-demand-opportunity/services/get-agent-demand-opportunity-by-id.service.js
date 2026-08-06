import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";

import { validateAgentDemandOpportunityId } from "../agent-demand-opportunity.validation.js";
import { toPublicAgentDemandOpportunity } from "../mappers/to-public-agent-demand-opportunity.js";
import { enrichOpportunitiesWithMatchingBuildingCounts } from "./enrich-opportunities-with-matching-building-counts.service.js";
import { loadAgentDemandOpportunityByIdService } from "./load-agent-demand-opportunity-by-id.service.js";

export const getAgentDemandOpportunityByIdService = async ({
  opportunityId,
  callerUserId,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const validatedOpportunityId =
    validateAgentDemandOpportunityId(opportunityId);
  const validatedCallerUserId = validateMongooseId(
    callerUserId,
    "callerUserId",
    { asObjectId: true },
  );

  const opportunity = await loadAgentDemandOpportunityByIdService({
    opportunityId: validatedOpportunityId,
    session,
  });

  const [enriched] = await enrichOpportunitiesWithMatchingBuildingCounts({
    opportunities: [opportunity],
    callerUserId: validatedCallerUserId,
    session,
  });

  return toPublicAgentDemandOpportunity(enriched);
};
