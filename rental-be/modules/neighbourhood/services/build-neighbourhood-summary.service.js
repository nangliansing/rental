import { NEIGHBOURHOOD_CATEGORIES } from "../neighbourhood.constants.js";

export const buildNeighbourhoodSummary = (places) => {
  const counts = Object.fromEntries(
    NEIGHBOURHOOD_CATEGORIES.map((category) => [category.key, 0]),
  );

  for (const place of places) {
    if (counts[place.category] !== undefined) {
      counts[place.category] += 1;
    }
  }

  const categories = NEIGHBOURHOOD_CATEGORIES.map((category) => ({
    key: category.key,
    label: category.label,
    priority: category.priority,
    count: counts[category.key],
  })).filter((category) => category.count > 0);

  return {
    summary: {
      all: places.length,
      ...counts,
    },
    categories,
  };
};
