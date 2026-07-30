import {
  validateMongooseId,
  validateNullableObject,
} from "../../../shared/validators/index.js";

import { getBuildingByIdService } from "../../building/services/get-building-by-id.service.js";

import {
  buildActiveUserFollowerLookupStages,
  buildPaginatedBuildingFollowSearchPipeline,
} from "../pipelines/index.js";
import {
  buildSearchBuildingFollowsParams,
  validateBuildingFollowBuildingId,
} from "../building-follow.validation.js";
import { executeBuildingFollowSearch } from "../utils/index.js";

export const searchBuildingFollowersService = async ({
  buildingId: buildingIdInput,
  queryInput = {},
  session = null,
}) => {
  validateNullableObject(session, "session");

  const buildingId = validateBuildingFollowBuildingId(buildingIdInput);
  const params = buildSearchBuildingFollowsParams(queryInput);

  await getBuildingByIdService(buildingId, session);

  const pipeline = buildPaginatedBuildingFollowSearchPipeline({
    match: { buildingId },
    page: params.page,
    limit: params.limit,
    lookupStages: buildActiveUserFollowerLookupStages(),
  });

  const { items, pagination } = await executeBuildingFollowSearch({
    pipeline,
    page: params.page,
    limit: params.limit,
    session,
  });

  return {
    followers: items,
    pagination,
  };
};
