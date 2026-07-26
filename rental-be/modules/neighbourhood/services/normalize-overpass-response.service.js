import { classifyOsmPlace } from "./classify-osm-place.service.js";

const resolvePlaceName = (tags) =>
  tags.name?.trim() ||
  tags["name:en"]?.trim() ||
  tags.brand?.trim() ||
  "Unnamed place";

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

  return {
    id: `osm-${element.type}-${element.id}`,
    name: resolvePlaceName(tags),
    lat,
    lng,
    category,
  };
};

export const normalizeOverpassResponse = (response) => {
  const elements = Array.isArray(response?.elements) ? response.elements : [];

  return elements
    .map((element) => normalizeOverpassElement(element))
    .filter(Boolean);
};
