export const NEIGHBOURHOOD_SOURCE = Object.freeze({
  OPENSTREETMAP: "openstreetmap",
});

export const DEFAULT_RADIUS_METERS = 1000;
export const DEFAULT_FETCH_RADIUS_METERS = 2000;
export const MIN_RADIUS_METERS = 500;
export const MAX_RADIUS_METERS = 2000;
export const MAX_FETCH_RADIUS_METERS = 2000;
export const MAX_RETURNED_PLACES = 200;
export const CACHE_COORDINATE_DECIMALS = 3;
export const NEIGHBOURHOOD_CACHE_VERSION = 3;

export const NEIGHBOURHOOD_CATEGORIES = Object.freeze([
  {
    key: "public_transport",
    label: "Public Transport",
    priority: 1,
    source: "hybrid",
    osmTagRules: [
      { key: "station", value: "subway" },
      { key: "station", value: "light_rail" },
      { key: "station", value: "monorail" },
      { key: "amenity", value: "ferry_terminal" },
    ],
  },
  {
    key: "convenience",
    label: "Convenience Stores",
    priority: 2,
    osmTagRules: [{ key: "shop", value: "convenience" }],
  },
  {
    key: "supermarket",
    label: "Supermarkets",
    priority: 3,
    osmTagRules: [{ key: "shop", value: "supermarket" }],
  },
  {
    key: "restaurant",
    label: "Restaurants",
    priority: 4,
    osmTagRules: [
      { key: "amenity", value: "restaurant" },
      { key: "amenity", value: "fast_food" },
    ],
  },
  {
    key: "cafe",
    label: "Cafés",
    priority: 5,
    osmTagRules: [{ key: "amenity", value: "cafe" }],
  },
  {
    key: "pharmacy",
    label: "Pharmacies",
    priority: 6,
    osmTagRules: [{ key: "amenity", value: "pharmacy" }],
  },
  {
    key: "market",
    label: "Markets",
    priority: 7,
    osmTagRules: [{ key: "amenity", value: "marketplace" }],
  },
  {
    key: "shopping_mall",
    label: "Shopping Malls",
    priority: 8,
    osmTagRules: [{ key: "shop", value: "mall" }],
  },
  {
    key: "gym",
    label: "Gyms",
    priority: 9,
    osmTagRules: [{ key: "leisure", value: "fitness_centre" }],
  },
  {
    key: "hospital",
    label: "Hospitals",
    priority: 10,
    osmTagRules: [
      { key: "amenity", value: "hospital" },
      { key: "amenity", value: "clinic" },
    ],
  },
]);

export const OSM_NEIGHBOURHOOD_CATEGORIES = NEIGHBOURHOOD_CATEGORIES.filter(
  (category) => Array.isArray(category.osmTagRules),
);

export const TRANSIT_OVERPASS_QUERIES = Object.freeze([
  {
    elementTypes: ["node", "way"],
    tagRules: [
      { key: "public_transport", value: "station" },
      { key: "railway", value: "station" },
      { key: "network", pattern: "^(BTS|MRT|SRT|Airport Rail Link)" },
    ],
  },
  {
    elementTypes: ["node", "way"],
    tagRules: [
      { key: "railway", value: "station" },
      { key: "network", pattern: "^(BTS|MRT|SRT|Airport Rail Link)" },
    ],
  },
  {
    elementTypes: ["node", "way"],
    tagRules: [
      { key: "public_transport", value: "station" },
      { key: "station", value: "monorail" },
    ],
  },
  {
    elementTypes: ["node", "way"],
    tagRules: [{ key: "amenity", value: "ferry_terminal" }],
  },
  {
    elementTypes: ["node"],
    tagRules: [
      { key: "public_transport", value: "stop_position" },
      { key: "ferry", value: "yes" },
    ],
  },
]);

export const NEIGHBOURHOOD_CATEGORY_BY_KEY = Object.freeze(
  Object.fromEntries(
    NEIGHBOURHOOD_CATEGORIES.map((category) => [category.key, category]),
  ),
);
