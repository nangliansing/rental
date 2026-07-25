// modules/search/filters/build-search-filters.js
import { validateObject } from "../../../shared/validators/index.js";

import { buildSearchAgentFilters } from "./build-search-agent-filters.js";
import { buildSearchBuildingFilters } from "./build-search-building-filters.js";
import { buildSearchListingFilters } from "./build-search-listing-filters.js";

export const buildSearchFilters = (body) => {
  validateObject(body, "body");

  return {
    building: buildSearchBuildingFilters(body),
    listing: buildSearchListingFilters(body),
    agent: buildSearchAgentFilters(body),
  };
};