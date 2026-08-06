import { validateObject } from "../../../shared/validators/index.js";
import {
  buildSearchAgentFilters,
  buildSearchBuildingFilters,
  buildSearchListingFilters,
} from "../../search/filters/index.js";

export const validateSavedSearchFilters = (input = {}) => {
  validateObject(input, "filters");

  return {
    ...buildSearchListingFilters(input),
    ...buildSearchBuildingFilters(input),
    ...buildSearchAgentFilters(input),
  };
};
