import { normalizePagination } from "../../../shared/utils/index.js";
import { validateNullableObject } from "../../../shared/validators/index.js";
import SavedSearch from "../../saved-search/saved-search.model.js";
import { DEMAND_OPPORTUNITY_QUERY_MAX_TIME_MS } from "../agent-demand-opportunity.constants.js";
import { validateSearchAgentDemandOpportunitiesBody } from "../agent-demand-opportunity.validation.js";
import { buildSearchAgentDemandOpportunitiesPipeline } from "../pipelines/build-search-agent-demand-opportunities.pipeline.js";
import { buildDemandOpportunityCoverage } from "../utils/build-demand-opportunity-coverage.js";

export const searchAgentDemandOpportunitiesService = async ({
  body,
  session = null,
}) => {
  validateNullableObject(session, "session");
  const { area, page, limit } =
    validateSearchAgentDemandOpportunitiesBody(body);
  const coverage = buildDemandOpportunityCoverage(area);
  const pipeline = buildSearchAgentDemandOpportunitiesPipeline({
    coverage,
    page,
    limit,
  });

  let query = SavedSearch.aggregate(pipeline).option({
    maxTimeMS: DEMAND_OPPORTUNITY_QUERY_MAX_TIME_MS,
  });

  if (session) {
    query = query.session(session);
  }

  const [result] = await query;

  return {
    opportunities: result?.data ?? [],
    pagination: normalizePagination(result?.pagination, page, limit),
  };
};
