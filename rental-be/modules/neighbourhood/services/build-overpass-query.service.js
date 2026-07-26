import {
  OSM_NEIGHBOURHOOD_CATEGORIES,
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
      rule.pattern
        ? formatRegexTagRule(rule)
        : formatTagRule(rule),
    )
    .join("");

  return `  ${elementType}${tagSelector}(around:${fetchRadiusMeters},${origin.lat},${origin.lng});`;
};

export const buildOverpassQuery = ({ origin, fetchRadiusMeters }) => {
  const osmQueryLines = OSM_NEIGHBOURHOOD_CATEGORIES.flatMap((category) =>
    category.osmTagRules.flatMap((rule) => [
      formatElementQuery({
        elementType: "node",
        tagRules: [rule],
        origin,
        fetchRadiusMeters,
      }),
      ...(category.key === "public_transport"
        ? [
            formatElementQuery({
              elementType: "way",
              tagRules: [rule],
              origin,
              fetchRadiusMeters,
            }),
          ]
        : []),
    ]),
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
