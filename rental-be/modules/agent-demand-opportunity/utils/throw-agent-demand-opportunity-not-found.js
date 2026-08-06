import { AppError } from "../../../shared/errors/app-error.js";

export const throwAgentDemandOpportunityNotFound = () => {
  throw new AppError(
    "Agent demand opportunity not found",
    404,
    "AGENT_DEMAND_OPPORTUNITY_NOT_FOUND",
  );
};
