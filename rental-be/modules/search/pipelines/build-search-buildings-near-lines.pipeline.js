import { buildSearchBuildingsPipeline } from "./helpers/index.js";

export const buildSearchBuildingsNearLinesPipeline = ({
  searchArea,
  filters,
  page = 1,
  limit = 20,
  includeBuildingsWithoutMatchingListings = false,
  viewerUserId = null,
}) =>
  buildSearchBuildingsPipeline({
    match: {
      location: {
        $geoWithin: {
          $geometry: searchArea,
        },
      },
    },
    filters,
    page,
    limit,
    includeBuildingsWithoutMatchingListings,
    viewerUserId,
  });
