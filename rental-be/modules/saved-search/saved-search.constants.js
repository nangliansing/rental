export const GEO_SEARCH_MODES = Object.freeze({
  AREA: "area",
  NEARBY: "nearby",
  LINE: "line",
});

export const SAVED_SEARCH_STATUSES = Object.freeze({
  WAITING: "Waiting",
  CLOSED: "Closed",
});

export const SAVED_SEARCH_NAME_MAX_LENGTH = 120;
export const SAVED_SEARCH_DESCRIPTION_MAX_LENGTH = 2_000;
export const SAVED_SEARCH_PLACE_NAME_MAX_LENGTH = 200;

export const GEO_SEARCH_MIN_RADIUS_METERS = 1;
export const GEO_SEARCH_MAX_RADIUS_METERS = 2_000;

export const GEO_SEARCH_MIN_DISTANCE_METERS = 1;
export const GEO_SEARCH_MAX_DISTANCE_METERS = 2_000;

export const LINE_GEOMETRY_TYPES = Object.freeze({
  LINE_STRING: "LineString",
  MULTI_LINE_STRING: "MultiLineString",
});
