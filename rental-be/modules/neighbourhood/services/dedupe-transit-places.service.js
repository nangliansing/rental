import { haversineDistanceMeters } from "../../../shared/geo/index.js";

const STATIC_TRANSIT_DEDUPE_RADIUS_METERS = 150;

const isOsmTransitPlace = (place) =>
  place.category === "public_transport" && place.id.startsWith("osm-");

const isStaticTransitPlace = (place) =>
  place.category === "public_transport" && !place.id.startsWith("osm-");

export const dedupeTransitPlaces = (
  places,
  dedupeRadiusMeters = STATIC_TRANSIT_DEDUPE_RADIUS_METERS,
) => {
  const staticTransitPlaces = places.filter(isStaticTransitPlace);
  const osmTransitPlaces = places.filter(isOsmTransitPlace);
  const otherPlaces = places.filter(
    (place) => place.category !== "public_transport",
  );

  const dedupedOsmTransitPlaces = osmTransitPlaces.filter(
    (osmPlace) =>
      !staticTransitPlaces.some(
        (staticPlace) =>
          haversineDistanceMeters(osmPlace, staticPlace) <= dedupeRadiusMeters,
      ),
  );

  return [...otherPlaces, ...staticTransitPlaces, ...dedupedOsmTransitPlaces];
};
