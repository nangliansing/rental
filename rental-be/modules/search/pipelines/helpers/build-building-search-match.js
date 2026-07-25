import { buildBuildingFilterMatch } from "./build-building-filter-match.js";

export const buildBuildingSearchMatch = ({
  match = {},
  filters = {},
  requireAvailableListings = false,
} = {}) => ({
  ...match,
  ...(requireAvailableListings
    ? {
        minRent: { $ne: null },
        maxRent: { $ne: null },
      }
    : {}),
  ...buildBuildingFilterMatch(filters),
});
