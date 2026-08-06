import { normalizePagination } from "../../../shared/utils/index.js";
import { validateNullableObject } from "../../../shared/validators/index.js";
import { AppError } from "../../../shared/errors/app-error.js";
import SavedSearch from "../../saved-search/saved-search.model.js";
import {
  DEMAND_OPPORTUNITY_MAX_RANKING_CANDIDATES,
  DEMAND_OPPORTUNITY_QUERY_MAX_TIME_MS,
} from "../agent-demand-opportunity.constants.js";
import { validateSearchAgentDemandOpportunitiesBody } from "../agent-demand-opportunity.validation.js";
import { buildSearchAgentDemandOpportunityCandidatesPipeline } from "../pipelines/build-search-agent-demand-opportunity-candidates.pipeline.js";
import { compareRankedOpportunities } from "../ranking/index.js";
import { buildDemandOpportunityCoverage } from "../utils/build-demand-opportunity-coverage.js";
import { filterOpportunitiesByMatchStatus } from "../utils/filter-opportunities-by-match-status.js";
import { resolveOpportunityAgentUserIds } from "../utils/resolve-opportunity-agent-user-ids.js";
import { translateInvalidGeoQueryError } from "../utils/translate-invalid-geo-query-error.js";
import { enrichOpportunitiesWithMatchingBuildingCounts } from "./enrich-opportunities-with-matching-building-counts.service.js";
import { rankAgentDemandOpportunities } from "./rank-agent-demand-opportunities.service.js";

export const searchAgentDemandOpportunitiesService = async ({
  body,
  callerUserId,
  session = null,
}) => {
  validateNullableObject(session, "session");
  const { area, page, limit, matchStatus } =
    validateSearchAgentDemandOpportunitiesBody(body);
  const coverage = buildDemandOpportunityCoverage(area);
  const pipeline = buildSearchAgentDemandOpportunityCandidatesPipeline({
    coverage,
    maximumCandidates: DEMAND_OPPORTUNITY_MAX_RANKING_CANDIDATES,
  });

  let query = SavedSearch.aggregate(pipeline).option({
    maxTimeMS: DEMAND_OPPORTUNITY_QUERY_MAX_TIME_MS,
  });

  if (session) {
    query = query.session(session);
  }

  let candidates;

  try {
    candidates = await query;
  } catch (error) {
    translateInvalidGeoQueryError(error);
  }

  if (candidates.length > DEMAND_OPPORTUNITY_MAX_RANKING_CANDIDATES) {
    throw new AppError(
      `Ranking is limited to ${DEMAND_OPPORTUNITY_MAX_RANKING_CANDIDATES} SavedSearch candidates; narrow the search area`,
      422,
      "OPPORTUNITY_CANDIDATE_LIMIT_EXCEEDED",
    );
  }

  const agentUserIdsByProfileId = await resolveOpportunityAgentUserIds({
    opportunities: candidates,
    session,
  });
  const ranked = await rankAgentDemandOpportunities({
    opportunities: candidates,
    callerUserId,
    agentUserIdsByProfileId,
    now: new Date(),
    session,
  });
  const filtered = filterOpportunitiesByMatchStatus(ranked, matchStatus).sort(
    compareRankedOpportunities,
  );
  const pageOpportunities = filtered.slice((page - 1) * limit, page * limit);

  const opportunities = await enrichOpportunitiesWithMatchingBuildingCounts({
    opportunities: pageOpportunities,
    callerUserId,
    agentUserIdsByProfileId,
    session,
  });

  return {
    opportunities,
    pagination: normalizePagination(
      { page, limit, total: filtered.length },
      page,
      limit,
    ),
  };
};
