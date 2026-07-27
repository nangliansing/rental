import {
  OSM_NEIGHBOURHOOD_CATEGORIES,
  OSM_WAY_QUERY_CATEGORY_KEYS,
  TRANSIT_OVERPASS_QUERIES,
} from "../neighbourhood.constants.js";

const formatTagRule = ({ key, value }) => `["${key}"="${value}"]`;

const formatRegexTagRule = ({ key, pattern }) => `["${key}"~"${pattern}",i]`;

const formatElementQuery = ({
  elementType,
  tagRules,
  origin,
  fetchRadiusMeters,
}) => {
  const tagSelector = tagRules
    .map((rule) =>
      rule.pattern ? formatRegexTagRule(rule) : formatTagRule(rule),
    )
    .join("");

  return `  ${elementType}${tagSelector}(around:${fetchRadiusMeters},${origin.lat},${origin.lng});`;
};

const shouldQueryWays = (categoryKey) =>
  categoryKey === "public_transport" ||
  OSM_WAY_QUERY_CATEGORY_KEYS.has(categoryKey);

export const buildOverpassQuery = ({ origin, fetchRadiusMeters }) => {
  const osmQueryLines = OSM_NEIGHBOURHOOD_CATEGORIES.flatMap((category) =>
    category.osmTagRules.flatMap((rule) => {
      const query = {
        tagRules: [rule],
        origin,
        fetchRadiusMeters,
      };

      return [
        formatElementQuery({ elementType: "node", ...query }),
        ...(shouldQueryWays(category.key)
          ? [formatElementQuery({ elementType: "way", ...query })]
          : []),
      ];
    }),
  );

  const transitQueryLines = TRANSIT_OVERPASS_QUERIES.flatMap((query) =>
    query.elementTypes.map((elementType) =>
      formatElementQuery({
        elementType,
        tagRules: query.tagRules,
        origin,
        fetchRadiusMeters,
      }),
    ),
  );

  return `[out:json][timeout:25];
(
${[...osmQueryLines, ...transitQueryLines].join("\n")}
);
out center tags;`;
};
