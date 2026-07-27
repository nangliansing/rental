const normalizeTagValue = (value) =>
  typeof value === "string" ? value.trim() : "";

export const isBusStationTags = (tags = {}) =>
  tags.amenity === "bus_station";

export const isBusStopTags = (tags = {}) => {
  if (isBusStationTags(tags)) {
    return false;
  }

  return (
    tags.highway === "bus_stop" ||
    (tags.public_transport === "platform" && tags.bus === "yes") ||
    (tags.public_transport === "stop_position" && tags.bus === "yes")
  );
};

export const isBusTransitTags = (tags = {}) =>
  isBusStationTags(tags) || isBusStopTags(tags);

export const resolveBusTransitRole = (tags = {}) => {
  if (isBusStationTags(tags)) {
    return "bus_station";
  }

  if (isBusStopTags(tags)) {
    return "bus_stop";
  }

  return null;
};

export const resolveBusStopLabel = (tags = {}) => {
  const name =
    normalizeTagValue(tags.name) ||
    normalizeTagValue(tags["name:en"]) ||
    normalizeTagValue(tags["name:th"]);

  if (name) {
    return name;
  }

  const ref = normalizeTagValue(tags.ref);

  if (ref) {
    return `Bus stop ${ref}`;
  }

  return "Bus stop";
};

export const resolveBusLineLabel = (tags = {}) => {
  const routeRef =
    normalizeTagValue(tags.route_ref) ||
    normalizeTagValue(tags["route_ref:en"]);

  if (routeRef) {
    return routeRef;
  }

  const ref = normalizeTagValue(tags.ref);

  if (ref && !/^\d+$/.test(ref)) {
    return ref;
  }

  const operator =
    normalizeTagValue(tags.operator) ||
    normalizeTagValue(tags["operator:en"]) ||
    normalizeTagValue(tags.network);

  return operator || null;
};

export const isBusTransitPlace = (place) =>
  place.category === "public_transport" && place.mode === "bus";

export const isBusStationPlace = (place) =>
  place.category === "public_transport" &&
  place.mode === "bus" &&
  place.transitRole === "bus_station";

export const isBusStopPlace = (place) =>
  place.category === "public_transport" &&
  place.mode === "bus" &&
  place.transitRole === "bus_stop";
