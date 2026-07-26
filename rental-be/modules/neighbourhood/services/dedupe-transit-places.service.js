import { haversineDistanceMeters } from "../../../shared/geo/index.js";

const TRANSIT_DEDUPE_RADIUS_METERS = 150;

const isOsmTransitPlace = (place) =>
  place.category === "public_transport" && place.id.startsWith("osm-");

const isStaticTransitPlace = (place) =>
  place.category === "public_transport" && !place.id.startsWith("osm-");

const isWithinTransitDedupeRadius = (left, right, dedupeRadiusMeters) =>
  haversineDistanceMeters(left, right) <= dedupeRadiusMeters;

export const dedupeTransitPlaces = (
  places,
  dedupeRadiusMeters = TRANSIT_DEDUPE_RADIUS_METERS,
) => {
  const staticTransitPlaces = places.filter(isStaticTransitPlace);
  const osmTransitPlaces = places.filter(isOsmTransitPlace);
  const otherPlaces = places.filter(
    (place) => place.category !== "public_transport",
  );
  const keptTransitPlaces = [...staticTransitPlaces];
  const dedupedOsmTransitPlaces = [];

  for (const osmPlace of osmTransitPlaces) {
    const isDuplicate = keptTransitPlaces.some((existingPlace) =>
      isWithinTransitDedupeRadius(osmPlace, existingPlace, dedupeRadiusMeters),
    );

    if (!isDuplicate) {
      dedupedOsmTransitPlaces.push(osmPlace);
      keptTransitPlaces.push(osmPlace);
    }
  }

  return [...otherPlaces, ...staticTransitPlaces, ...dedupedOsmTransitPlaces];
};
