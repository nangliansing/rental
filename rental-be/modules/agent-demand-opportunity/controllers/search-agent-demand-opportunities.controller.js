import { searchAgentDemandOpportunitiesService } from "../services/search-agent-demand-opportunities.service.js";

export const searchAgentDemandOpportunitiesController = async (
  req,
  res,
  next,
) => {
  try {
    const result = await searchAgentDemandOpportunitiesService({
      body: req.body,
      session: req.dbSession ?? null,
    });

    return res.status(200).json({
      success: true,
      data: result.opportunities,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};
