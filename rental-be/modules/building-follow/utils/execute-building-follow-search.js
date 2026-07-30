import { normalizePagination } from "../../../shared/utils/index.js";

import BuildingFollow from "../building-follow.model.js";
import { applyOptionalSession } from "./building-follow-query.helpers.js";

export const executeBuildingFollowSearch = async ({
  pipeline,
  page,
  limit,
  session = null,
}) => {
  const aggregateQuery = BuildingFollow.aggregate(pipeline);
  const [result] = await applyOptionalSession(aggregateQuery, session);

  return {
    items: result?.data ?? [],
    pagination: normalizePagination(result?.pagination, page, limit),
  };
};
