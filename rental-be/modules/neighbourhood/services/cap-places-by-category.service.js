import { DENSE_POI_CATEGORY_CAPS } from "../neighbourhood.constants.js";
import { sortPlacesByDistanceThenName } from "./neighbourhood-place.utils.js";

export const capPlacesByCategory = (places) => {
  const groupedPlaces = places.reduce((groups, place) => {
    const categoryPlaces = groups.get(place.category) ?? [];
    categoryPlaces.push(place);
    groups.set(place.category, categoryPlaces);
    return groups;
  }, new Map());

  const cappedPlaces = [];
  const truncatedCategories = {};

  for (const [category, categoryPlaces] of groupedPlaces.entries()) {
    const sortedPlaces = [...categoryPlaces].sort(sortPlacesByDistanceThenName);
    const categoryCap = DENSE_POI_CATEGORY_CAPS[category];

    if (categoryCap != null && sortedPlaces.length > categoryCap) {
      truncatedCategories[category] = true;
      cappedPlaces.push(...sortedPlaces.slice(0, categoryCap));
      continue;
    }

    cappedPlaces.push(...sortedPlaces);
  }

  return {
    places: cappedPlaces,
    truncatedCategories,
  };
};
