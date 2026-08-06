import Building from "../../building/building.model.js";
import { DEMAND_OPPORTUNITY_QUERY_MAX_TIME_MS } from "../agent-demand-opportunity.constants.js";
import { buildMatchingBuildingClassificationsPipeline } from "../pipelines/build-matching-building-classifications.pipeline.js";

export const countMatchingBuildingsForOpportunity = async ({
  opportunity,
  callerUserId,
  listedByUserIds,
  maximumBuildings,
  session = null,
}) => {
  const pipeline = buildMatchingBuildingClassificationsPipeline({
    coverage: opportunity.geoSearch.coverage,
    filters: opportunity.filters ?? {},
    callerUserId,
    listedByUserIds,
    maximumBuildings,
  });
  let query = Building.aggregate(pipeline).option({
    maxTimeMS: DEMAND_OPPORTUNITY_QUERY_MAX_TIME_MS,
  });
  if (session) query = query.session(session);

  const classifications = await query;
  const counted = classifications.slice(0, maximumBuildings);

  return {
    myMatchingBuildingCount: counted.filter(({ isMine }) => isMine).length,
    platformMatchingBuildingCount: counted.filter(({ isMine }) => !isMine)
      .length,
    matchingBuildingCountCapped: classifications.length > maximumBuildings,
  };
};
