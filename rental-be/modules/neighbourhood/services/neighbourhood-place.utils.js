import { AppError } from "../../../shared/errors/app-error.js";
import { haversineDistanceMeters } from "../../../shared/geo/index.js";

import { NEIGHBOURHOOD_CATEGORY_BY_KEY } from "../neighbourhood.constants.js";

export const sortPlacesByDistanceThenName = (left, right) =>
  left.distanceMeters - right.distanceMeters ||
  left.name.localeCompare(right.name);

export const resolveOsmPlaceName = (tags = {}) =>
  tags.name?.trim() ||
  tags["name:en"]?.trim() ||
  tags.brand?.trim() ||
  "Unnamed place";

export const isValidNeighbourhoodPlace = (place) => {
  if (!place || typeof place !== "object") {
    return false;
  }

  if (typeof place.id !== "string" || place.id.length === 0) {
    return false;
  }

  if (typeof place.name !== "string" || typeof place.category !== "string") {
    return false;
  }

  if (!NEIGHBOURHOOD_CATEGORY_BY_KEY[place.category]) {
    return false;
  }

  if (
    !Number.isFinite(place.lat) ||
    place.lat < -90 ||
    place.lat > 90 ||
    !Number.isFinite(place.lng) ||
    place.lng < -180 ||
    place.lng > 180
  ) {
    return false;
  }

  return true;
};

export const sanitizeNeighbourhoodPlaces = (places) =>
  Array.isArray(places) ? places.filter(isValidNeighbourhoodPlace) : [];

export const validateNeighbourhoodOrigin = (origin, fieldName = "origin") => {
  if (!origin || typeof origin !== "object" || Array.isArray(origin)) {
    throw new AppError(`${fieldName} is required`, 422, "VALIDATION_ERROR");
  }

  if (!Number.isFinite(origin.lat) || origin.lat < -90 || origin.lat > 90) {
    throw new AppError(
      `${fieldName}.lat must be a valid latitude`,
      422,
      "VALIDATION_ERROR",
    );
  }

  if (!Number.isFinite(origin.lng) || origin.lng < -180 || origin.lng > 180) {
    throw new AppError(
      `${fieldName}.lng must be a valid longitude`,
      422,
      "VALIDATION_ERROR",
    );
  }

  return origin;
};

export const attachDistanceMeters = (origin, places) =>
  places.map((place) => ({
    ...place,
    distanceMeters: Math.round(
      haversineDistanceMeters(origin, {
        lat: place.lat,
        lng: place.lng,
      }),
    ),
  }));

export const toFetchedAtDate = (value) =>
  value instanceof Date && !Number.isNaN(value.getTime())
    ? value
    : new Date(value);
