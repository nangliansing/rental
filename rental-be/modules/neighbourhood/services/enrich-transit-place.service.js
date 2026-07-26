import { findNearbyStaticTransitStation } from "./load-static-transit-places.service.js";

const BTS_NAME_PATTERN = /\bbts\b/i;
const MRT_NAME_PATTERN = /\bmrt\b/i;
const ARL_NAME_PATTERN = /\b(airport rail link|arl)\b/i;

const normalizeTagValue = (value) =>
  typeof value === "string" ? value.trim() : "";

const buildTransitContext = (tags = {}, name = "") => {
  const network = normalizeTagValue(tags.network);
  const operator = normalizeTagValue(tags.operator);
  const operatorEn = normalizeTagValue(tags["operator:en"]);
  const route = normalizeTagValue(tags.route);
  const line = normalizeTagValue(tags.line);
  const station = normalizeTagValue(tags.station);
  const ref = normalizeTagValue(tags.ref);
  const label = normalizeTagValue(name);

  return {
    network,
    operator,
    operatorEn,
    route,
    line,
    station,
    ref,
    label,
    combined: `${network} ${operator} ${operatorEn} ${route} ${line} ${station} ${ref} ${label}`,
  };
};

export const resolveTransitMode = (tags = {}, name = "") => {
  const context = buildTransitContext(tags, name);
  const haystack = context.combined.toLowerCase();

  if (BTS_NAME_PATTERN.test(context.combined) || haystack.includes("bts")) {
    return "bts";
  }

  if (MRT_NAME_PATTERN.test(context.combined) || haystack.includes("mrt")) {
    return "mrt";
  }

  if (ARL_NAME_PATTERN.test(context.combined)) {
    return "rail";
  }

  if (
    tags.amenity === "ferry_terminal" ||
    tags.ferry === "yes" ||
    /\b(ferry|boat|pier)\b/i.test(context.combined)
  ) {
    return "ferry";
  }

  if (context.station === "subway" || context.station === "monorail") {
    return "mrt";
  }

  if (context.station === "light_rail") {
    return "bts";
  }

  if (/^yl\d+/i.test(context.ref)) {
    return "mrt";
  }

  if (haystack.includes("srt") || haystack.includes("red line")) {
    return "rail";
  }

  return "transit";
};

export const resolveTransitLine = (tags = {}, name = "") => {
  const context = buildTransitContext(tags, name);

  if (context.line) {
    return context.line;
  }

  if (context.route) {
    return context.route;
  }

  if (/^yl\d+/i.test(context.ref)) {
    return "Yellow Line";
  }

  if (/^pp\d+/i.test(context.ref)) {
    return "Pink Line";
  }

  if (/^or\d+/i.test(context.ref)) {
    return "Orange Line";
  }

  const haystack = context.combined.toLowerCase();

  if (haystack.includes("sukhumvit")) {
    return "Sukhumvit Line";
  }

  if (haystack.includes("silom")) {
    return "Silom Line";
  }

  if (haystack.includes("blue line")) {
    return "Blue Line";
  }

  if (haystack.includes("purple line")) {
    return "Purple Line";
  }

  if (haystack.includes("yellow line")) {
    return "Yellow Line";
  }

  if (haystack.includes("pink line")) {
    return "Pink Line";
  }

  if (haystack.includes("orange line")) {
    return "Orange Line";
  }

  if (haystack.includes("airport rail link")) {
    return "Airport Rail Link";
  }

  if (haystack.includes("chao phraya")) {
    return "Chao Phraya Express Boat";
  }

  if (haystack.includes("saen saep")) {
    return "Khlong Saen Saep Boat";
  }

  return null;
};

export const enrichTransitPlace = (place, tags = {}) => {
  if (place.category !== "public_transport") {
    return place;
  }

  const nearbyStaticStation = findNearbyStaticTransitStation({
    lat: place.lat,
    lng: place.lng,
  });

  const resolvedMode = resolveTransitMode(tags, place.name);
  const mode =
    resolvedMode !== "transit"
      ? resolvedMode
      : nearbyStaticStation?.mode ?? resolvedMode;
  const line =
    resolveTransitLine(tags, place.name) ?? nearbyStaticStation?.line ?? undefined;
  const name =
    place.name === "Unnamed place" && nearbyStaticStation?.name
      ? nearbyStaticStation.name
      : place.name;

  return {
    ...place,
    name,
    ...(mode ? { mode } : {}),
    ...(line ? { line } : {}),
  };
};
