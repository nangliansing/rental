import { OSM_NEIGHBOURHOOD_CATEGORIES } from "../neighbourhood.constants.js";
import { isBusTransitTags } from "./bus-transit.utils.js";

const matchesTagRule = (tags, rule) => tags?.[rule.key] === rule.value;

const BTS_NETWORK_PATTERN = /\bbts\b/i;
const MRT_NETWORK_PATTERN = /\bmrt\b/i;
const ARL_NETWORK_PATTERN = /\b(airport rail link|arl)\b/i;
const MONORAIL_OPERATOR_PATTERN =
  /\b(eastern bangkok monorail|monorail|mrta|mass rapid transit)\b/i;
const FERRY_OPERATOR_PATTERN =
  /\b(chao phraya|express boat|saen saep|khlong|ferry|boat)\b/i;
const MRT_LINE_REF_PATTERN = /^(YL|PP|OR|BL|PU)\d+/i;

const buildTransitHintHaystack = (tags = {}) =>
  [
    tags.network,
    tags["network:en"],
    tags["network:short"],
    tags.operator,
    tags["operator:en"],
    tags.name,
    tags["name:en"],
    tags.ref,
    tags.line,
    tags.route,
  ]
    .filter(Boolean)
    .join(" ");

const hasTransitNetworkHint = (tags = {}) => {
  const haystack = buildTransitHintHaystack(tags);

  return (
    BTS_NETWORK_PATTERN.test(haystack) ||
    MRT_NETWORK_PATTERN.test(haystack) ||
    ARL_NETWORK_PATTERN.test(haystack) ||
    MONORAIL_OPERATOR_PATTERN.test(haystack) ||
    FERRY_OPERATOR_PATTERN.test(haystack) ||
    MRT_LINE_REF_PATTERN.test(String(tags.ref ?? ""))
  );
};

export const isPublicTransportStation = (tags = {}) => {
  if (!tags || typeof tags !== "object") {
    return false;
  }

  if (tags.amenity === "ferry_terminal") {
    return true;
  }

  if (tags.public_transport === "stop_position" && tags.ferry === "yes") {
    return true;
  }

  if (
    tags.station === "subway" ||
    tags.station === "light_rail" ||
    tags.station === "monorail"
  ) {
    return true;
  }

  if (tags.monorail === "yes" && tags.public_transport === "station") {
    return true;
  }

  if (tags.public_transport !== "station") {
    return false;
  }

  if (tags.railway !== "station" && tags.railway !== "halt") {
    return false;
  }

  return (
    tags.station === "subway" ||
    tags.station === "light_rail" ||
    tags.station === "monorail" ||
    hasTransitNetworkHint(tags)
  );
};

export const classifyOsmPlace = (tags) => {
  if (!tags || typeof tags !== "object") {
    return null;
  }

  if (isPublicTransportStation(tags)) {
    return "public_transport";
  }

  if (isBusTransitTags(tags)) {
    return "public_transport";
  }

  for (const category of OSM_NEIGHBOURHOOD_CATEGORIES) {
    if (category.osmTagRules.some((rule) => matchesTagRule(tags, rule))) {
      return category.key;
    }
  }

  return null;
};
