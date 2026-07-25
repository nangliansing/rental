import { normalizePagination } from "../../../shared/utils/index.js";

import Building from "../../building/building.model.js";

export const executePaginatedBuildingSearch = async ({
  pipeline,
  page,
  limit,
  session = null,
}) => {
  let aggregateQuery = Building.aggregate(pipeline);

  if (session) {
    aggregateQuery = aggregateQuery.session(session);
  }

  const [result] = await aggregateQuery;

  return {
    data: result?.data ?? [],
    pagination: normalizePagination(result?.pagination, page, limit),
  };
};
