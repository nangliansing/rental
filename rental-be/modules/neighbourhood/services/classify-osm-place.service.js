import { OSM_NEIGHBOURHOOD_CATEGORIES } from "../neighbourhood.constants.js";

const matchesTagRule = (tags, rule) => tags?.[rule.key] === rule.value;

export const classifyOsmPlace = (tags) => {
  if (!tags || typeof tags !== "object") {
    return null;
  }

  for (const category of OSM_NEIGHBOURHOOD_CATEGORIES) {
    if (category.osmTagRules.some((rule) => matchesTagRule(tags, rule))) {
      return category.key;
    }
  }

  return null;
};
