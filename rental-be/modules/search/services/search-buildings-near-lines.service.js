import { buildLineBufferGeometry } from "../../../shared/geo/index.js";
import { validateNullableObject } from "../../../shared/validators/index.js";

import { buildSearchBuildingsNearLinesParams } from "../params/index.js";
import { buildSearchBuildingsNearLinesPipeline } from "../pipelines/index.js";
import { applyAgentProfileListingFilter } from "./apply-agent-profile-listing-filter.js";
import { executePaginatedBuildingSearch } from "./execute-paginated-building-search.js";
import { normalizeOptionalViewerId } from "./normalize-optional-viewer-id.js";

export const searchBuildingsNearLinesService = async ({
  bodyInput,
  viewerUserId = null,
  session = null,
}) => {
  validateNullableObject(session, "session");

  const params = buildSearchBuildingsNearLinesParams(bodyInput);
  const searchParams = await applyAgentProfileListingFilter(params, session);
  const searchArea = buildLineBufferGeometry(
    searchParams.geometry,
    searchParams.distanceMeters,
  );
  const pipeline = buildSearchBuildingsNearLinesPipeline({
    ...searchParams,
    searchArea,
    viewerUserId: normalizeOptionalViewerId(viewerUserId),
  });

  return executePaginatedBuildingSearch({
    pipeline,
    page: searchParams.page,
    limit: searchParams.limit,
    session,
  });
};
