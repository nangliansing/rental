// modules/search/params/build-search-listings-in-building-params.js
import {
  validateMongooseId,
  validateObject,
  validatePage,
  validateLimit,
} from "../../../shared/validators/index.js";

import { buildSearchFilters } from "../filters/index.js";

export const buildSearchListingsInBuildingParams = (params, body) => {
  validateObject(params, "params");
  validateObject(body, "body");

  return {
    buildingId: validateMongooseId(params.buildingId, "buildingId", {
      asObjectId: true,
    }),
    filters: buildSearchFilters(body),
    page: validatePage(body.page),
    limit: validateLimit(body.limit),
  };
};