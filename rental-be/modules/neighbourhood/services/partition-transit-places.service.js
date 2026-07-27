import { haversineDistanceMeters } from "../../../shared/geo/index.js";

import { BUS_STOP_DEDUPE_RADIUS_METERS } from "../neighbourhood.constants.js";
import { isBusStopPlace, isBusStationPlace } from "./bus-transit.utils.js";
import { sortPlacesByDistanceThenName } from "./neighbourhood-place.utils.js";

export const dedupeNearbyBusStops = (busStops) => {
  const sortedStops = [...busStops].sort(sortPlacesByDistanceThenName);
  const kept = [];

  for (const stop of sortedStops) {
    const hasNearbyStop = kept.some(
      (existing) =>
        haversineDistanceMeters(existing, stop) <= BUS_STOP_DEDUPE_RADIUS_METERS,
    );

    if (!hasNearbyStop) {
      kept.push(stop);
    }
  }

  return kept;
};

export const partitionTransitPlaces = (transitPlaces) => {
  const railAndFerry = [];
  const busStations = [];
  const busStops = [];

  for (const place of transitPlaces) {
    if (isBusStopPlace(place)) {
      busStops.push(place);
      continue;
    }

    if (isBusStationPlace(place)) {
      busStations.push(place);
      continue;
    }

    railAndFerry.push(place);
  }

  return {
    railAndFerry,
    busStations,
    busStops,
  };
};
