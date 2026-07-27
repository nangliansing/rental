import { classifyOsmPlace } from "./classify-osm-place.service.js";
import { dedupeNearbyOsmPlaces } from "./dedupe-nearby-osm-places.service.js";
import { enrichTransitPlace } from "./enrich-transit-place.service.js";
import { resolveOsmPlaceName } from "./neighbourhood-place.utils.js";

export const normalizeOverpassElement = (element) => {
  const lat = element.lat ?? element.center?.lat;
  const lng = element.lon ?? element.center?.lon;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const tags = element.tags ?? {};
  const category = classifyOsmPlace(tags);

  if (!category) {
    return null;
  }

  return enrichTransitPlace(
    {
      id: `osm-${element.type}-${element.id}`,
      name: resolveOsmPlaceName(tags),
      lat,
      lng,
      category,
    },
    tags,
  );
};

export const normalizeOverpassResponse = (response) => {
  const elements = Array.isArray(response?.elements) ? response.elements : [];

  return dedupeNearbyOsmPlaces(
    elements
      .map((element) => normalizeOverpassElement(element))
      .filter(Boolean),
  );
};
