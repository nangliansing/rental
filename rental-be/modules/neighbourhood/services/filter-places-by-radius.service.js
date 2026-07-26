import { haversineDistanceMeters } from "../../../shared/geo/index.js";

import { MAX_RETURNED_PLACES } from "../neighbourhood.constants.js";

export const filterPlacesByRadius = ({
  origin,
  places,
  radiusMeters,
  maxPlaces = MAX_RETURNED_PLACES,
}) =>
  places
    .map((place) => ({
      ...place,
      distanceMeters: Math.round(
        haversineDistanceMeters(origin, {
          lat: place.lat,
          lng: place.lng,
        }),
      ),
    }))
    .filter((place) => place.distanceMeters <= radiusMeters)
    .sort(
      (left, right) =>
        left.distanceMeters - right.distanceMeters ||
        left.name.localeCompare(right.name),
    )
    .slice(0, maxPlaces);
