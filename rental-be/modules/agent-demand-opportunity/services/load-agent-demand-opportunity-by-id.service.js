import { SAVED_SEARCH_STATUSES } from "../../saved-search/saved-search.constants.js";
import SavedSearch from "../../saved-search/saved-search.model.js";
import { throwAgentDemandOpportunityNotFound } from "../utils/throw-agent-demand-opportunity-not-found.js";

/**
 * Loads one Waiting, non-deleted SavedSearch for agent demand detail.
 * Missing, Closed, and soft-deleted rows share the same not-found error.
 */
export const loadAgentDemandOpportunityByIdService = async ({
  opportunityId,
  session = null,
}) => {
  let opportunityQuery = SavedSearch.findOne({
    _id: opportunityId,
    status: SAVED_SEARCH_STATUSES.WAITING,
    isDeleted: false,
  })
    // Needed for matching-building counts; stripped again by public mapper.
    .select("+geoSearch.coverage")
    .lean();

  if (session) {
    opportunityQuery = opportunityQuery.session(session);
  }

  const opportunity = await opportunityQuery;

  if (!opportunity) {
    throwAgentDemandOpportunityNotFound();
  }

  return opportunity;
};
