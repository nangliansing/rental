import {
  MAX_BUS_STOPS_RETURNED,
  MAX_RETURNED_PLACES,
} from "../neighbourhood.constants.js";
import { capPlacesByCategory } from "./cap-places-by-category.service.js";
import {
  attachDistanceMeters,
  sanitizeNeighbourhoodPlaces,
  sortPlacesByDistanceThenName,
  validateNeighbourhoodOrigin,
} from "./neighbourhood-place.utils.js";
import {
  dedupeNearbyBusStops,
  partitionTransitPlaces,
} from "./partition-transit-places.service.js";

export const filterPlacesByRadius = ({
  origin,
  places,
  radiusMeters,
  maxPlaces = MAX_RETURNED_PLACES,
  maxBusStops = MAX_BUS_STOPS_RETURNED,
}) => {
  validateNeighbourhoodOrigin(origin);

  const placesWithDistance = attachDistanceMeters(
    origin,
    sanitizeNeighbourhoodPlaces(places),
  ).filter((place) => place.distanceMeters <= radiusMeters);

  const transitPlacesWithDistance = placesWithDistance.filter(
    (place) => place.category === "public_transport",
  );
  const { railAndFerry, busStations, busStops } = partitionTransitPlaces(
    transitPlacesWithDistance,
  );
  const dedupedBusStops = dedupeNearbyBusStops(busStops).sort(
    sortPlacesByDistanceThenName,
  );
  const busStopsTruncated = dedupedBusStops.length > maxBusStops;
  const busStopsWithinRadius = dedupedBusStops.slice(0, maxBusStops);
  const transitPlaces = [
    ...railAndFerry,
    ...busStations,
    ...busStopsWithinRadius,
  ].sort(sortPlacesByDistanceThenName);

  const nonTransitPlaces = placesWithDistance.filter(
    (place) => place.category !== "public_transport",
  );
  const {
    places: categoryCappedPlaces,
    truncatedCategories: denseTruncatedCategories,
  } = capPlacesByCategory(nonTransitPlaces);
  const sortedNonTransitPlaces = [...categoryCappedPlaces].sort(
    sortPlacesByDistanceThenName,
  );
  const globalBackstopApplied = sortedNonTransitPlaces.length > maxPlaces;
  const otherPlaces = sortedNonTransitPlaces.slice(0, maxPlaces);
  const truncatedCategories = { ...denseTruncatedCategories };

  if (busStopsTruncated) {
    truncatedCategories.public_transport = true;
  }

  const filteredPlaces = [...transitPlaces, ...otherPlaces].sort(
    sortPlacesByDistanceThenName,
  );

  return {
    places: filteredPlaces,
    truncation: {
      truncated:
        Object.keys(truncatedCategories).length > 0 || globalBackstopApplied,
      totalWithinRadius: placesWithDistance.length,
      categories: truncatedCategories,
      globalBackstopApplied,
    },
  };
};
