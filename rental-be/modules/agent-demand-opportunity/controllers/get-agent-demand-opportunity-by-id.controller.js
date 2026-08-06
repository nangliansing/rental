import { getAgentDemandOpportunityByIdService } from "../services/get-agent-demand-opportunity-by-id.service.js";

export const getAgentDemandOpportunityByIdController = async (
  req,
  res,
  next,
) => {
  try {
    const opportunity = await getAgentDemandOpportunityByIdService({
      opportunityId: req.params.opportunityId,
      callerUserId: req.currentUser._id,
      session: req.dbSession ?? null,
    });

    return res.status(200).json({
      success: true,
      data: opportunity,
    });
  } catch (error) {
    return next(error);
  }
};
