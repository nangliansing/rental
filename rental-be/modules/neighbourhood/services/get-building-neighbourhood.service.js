import { toLatLngFromGeoJsonCoordinates } from "../../../shared/geo/index.js";
import { validateNullableObject } from "../../../shared/validators/index.js";

import { getBuildingByIdService } from "../../building/services/index.js";
import { buildGetBuildingNeighbourhoodParams } from "../params/build-get-building-neighbourhood-params.js";
import { NEIGHBOURHOOD_SOURCE } from "../neighbourhood.constants.js";
import { buildNeighbourhoodSummary } from "./build-neighbourhood-summary.service.js";
import { filterPlacesByRadius } from "./filter-places-by-radius.service.js";
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
  const origin = toLatLngFromGeoJsonCoordinates(building.location.coordinates);
  const { places: cachedPlaces, fetchedAt, cacheStatus } =
    await resolveNeighbourhoodPlaces({
      origin,
      fetchRadiusMeters: params.fetchRadiusMeters,
      session,
    });
  const places = filterPlacesByRadius({
    origin,
    places: cachedPlaces,
    radiusMeters: params.radiusMeters,
  });
  const { summary, categories } = buildNeighbourhoodSummary(places);

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
