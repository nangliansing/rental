import { haversineDistanceMeters } from "../../../shared/geo/index.js";

const NAMED_PLACE_DEDUPE_RADIUS_METERS = 75;
const UNNAMED_PLACE_DEDUPE_RADIUS_METERS = 25;
const UNNAMED_PLACE_LABEL = "unnamed place";

const normalizePlaceName = (name) =>
  String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const namesLikelySame = (leftName, rightName) => {
  const left = normalizePlaceName(leftName);
  const right = normalizePlaceName(rightName);

  if (!left || !right) {
    return false;
  }

  if (left === right) {
    return true;
  }

  if (left === UNNAMED_PLACE_LABEL || right === UNNAMED_PLACE_LABEL) {
    return true;
  }

  return left.includes(right) || right.includes(left);
};

const placePreferenceRank = (place) => {
  let rank = 0;

  if (place.id.startsWith("osm-way-")) {
    rank += 2;
  }

  if (normalizePlaceName(place.name) !== UNNAMED_PLACE_LABEL) {
    rank += 1;
  }

  return rank;
};

const dedupeRadiusMeters = (leftName, rightName) =>
  normalizePlaceName(leftName) === UNNAMED_PLACE_LABEL ||
  normalizePlaceName(rightName) === UNNAMED_PLACE_LABEL
    ? UNNAMED_PLACE_DEDUPE_RADIUS_METERS
    : NAMED_PLACE_DEDUPE_RADIUS_METERS;

export const dedupeNearbyOsmPlaces = (places) => {
  const kept = [];

  for (const place of places) {
    const duplicateIndex = kept.findIndex((existing) => {
      if (existing.category !== place.category) {
        return false;
      }

      const radiusMeters = dedupeRadiusMeters(existing.name, place.name);

      return (
        haversineDistanceMeters(existing, place) <= radiusMeters &&
        namesLikelySame(existing.name, place.name)
      );
    });

    if (duplicateIndex === -1) {
      kept.push(place);
      continue;
    }

    if (placePreferenceRank(place) > placePreferenceRank(kept[duplicateIndex])) {
      kept[duplicateIndex] = place;
    }
  }

  return kept;
};
