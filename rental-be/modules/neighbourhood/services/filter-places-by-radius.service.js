import { haversineDistanceMeters } from "../../../shared/geo/index.js";

import { MAX_RETURNED_PLACES } from "../neighbourhood.constants.js";

const sortPlaces = (left, right) =>
  left.distanceMeters - right.distanceMeters ||
  left.name.localeCompare(right.name);

export const filterPlacesByRadius = ({
  origin,
  places,
  radiusMeters,
  maxPlaces = MAX_RETURNED_PLACES,
}) => {
  const placesWithDistance = places
    .map((place) => ({
      ...place,
      distanceMeters: Math.round(
        haversineDistanceMeters(origin, {
          lat: place.lat,
          lng: place.lng,
        }),
      ),
    }))
    .filter((place) => place.distanceMeters <= radiusMeters);

  const transitPlaces = placesWithDistance
    .filter((place) => place.category === "public_transport")
    .sort(sortPlaces);
  const otherPlaces = placesWithDistance
    .filter((place) => place.category !== "public_transport")
    .sort(sortPlaces)
    .slice(0, maxPlaces);

  return [...transitPlaces, ...otherPlaces].sort(sortPlaces);
};
