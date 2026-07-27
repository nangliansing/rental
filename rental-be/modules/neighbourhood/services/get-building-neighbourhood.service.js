import { toLatLngFromGeoJsonCoordinates } from "../../../shared/geo/index.js";
import {
  validateCoordinates,
  validateNullableObject,
} from "../../../shared/validators/index.js";

import { getBuildingByIdService } from "../../building/services/index.js";
import { buildGetBuildingNeighbourhoodParams } from "../params/build-get-building-neighbourhood-params.js";
import { NEIGHBOURHOOD_SOURCE } from "../neighbourhood.constants.js";
import { buildNeighbourhoodSummary } from "./build-neighbourhood-summary.service.js";
import { filterPlacesByRadius } from "./filter-places-by-radius.service.js";
import { validateNeighbourhoodOrigin } from "./neighbourhood-place.utils.js";
import { resolveNeighbourhoodPlaces } from "./resolve-neighbourhood-places.service.js";

export const getBuildingNeighbourhoodService = async ({
  buildingIdInput,
  queryInput = {},
  session = null,
}) => {
  validateNullableObject(session, "session");

  const params = buildGetBuildingNeighbourhoodParams({
    buildingIdInput,
    queryInput,
  });
  const building = await getBuildingByIdService(params.buildingId, session);
  const coordinates = validateCoordinates(
    building.location?.coordinates,
    "building.location.coordinates",
  );
  const origin = validateNeighbourhoodOrigin(
    toLatLngFromGeoJsonCoordinates(coordinates),
  );
  const { places: cachedPlaces, fetchedAt, cacheStatus } =
    await resolveNeighbourhoodPlaces({
      origin,
      fetchRadiusMeters: params.fetchRadiusMeters,
      session,
    });
  const { places, truncation } = filterPlacesByRadius({
    origin,
    places: cachedPlaces,
    radiusMeters: params.radiusMeters,
  });
  const { summary, categories } = buildNeighbourhoodSummary(places, {
    truncated: truncation.truncated,
    totalWithinRadius: truncation.totalWithinRadius,
    truncatedCategories: truncation.categories,
  });

  return {
    buildingId: building._id.toString(),
    origin,
    radiusMeters: params.radiusMeters,
    fetchRadiusMeters: params.fetchRadiusMeters,
    fetchedAt: fetchedAt.toISOString(),
    cacheStatus,
    source: NEIGHBOURHOOD_SOURCE.OPENSTREETMAP,
    summary,
    categories,
    places,
  };
};
