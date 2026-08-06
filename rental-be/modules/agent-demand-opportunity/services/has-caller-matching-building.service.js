import Listing from "../../listing/listing.model.js";
import { DEMAND_OPPORTUNITY_QUERY_MAX_TIME_MS } from "../agent-demand-opportunity.constants.js";
import { buildCallerMatchingListingExistsPipeline } from "../pipelines/build-caller-matching-listing-exists.pipeline.js";

export const hasCallerMatchingBuilding = async ({
  opportunity,
  callerUserId,
  listedByUserIds,
  session = null,
}) => {
  if (
    listedByUserIds !== undefined &&
    !listedByUserIds.some((userId) => String(userId) === String(callerUserId))
  ) {
    return false;
  }

  const pipeline = buildCallerMatchingListingExistsPipeline({
    coverage: opportunity.geoSearch.coverage,
    filters: opportunity.filters ?? {},
    callerUserId,
  });
  let query = Listing.aggregate(pipeline).option({
    maxTimeMS: DEMAND_OPPORTUNITY_QUERY_MAX_TIME_MS,
  });
  if (session) query = query.session(session);
  return (await query).length > 0;
};
