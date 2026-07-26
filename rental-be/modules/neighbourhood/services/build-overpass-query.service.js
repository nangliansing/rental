import { OSM_NEIGHBOURHOOD_CATEGORIES } from "../neighbourhood.constants.js";

const formatTagRule = ({ key, value }) =>
  `["${key}"="${value}"]`;

export const buildOverpassQuery = ({ origin, fetchRadiusMeters }) => {
  const queryLines = OSM_NEIGHBOURHOOD_CATEGORIES.flatMap((category) =>
    category.osmTagRules.map(
      (rule) =>
        `  node${formatTagRule(rule)}(around:${fetchRadiusMeters},${origin.lat},${origin.lng});`,
    ),
  );

  return `[out:json][timeout:25];
(
${queryLines.join("\n")}
);
out center tags;`;
};
