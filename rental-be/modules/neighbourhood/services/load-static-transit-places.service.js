import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { haversineDistanceMeters } from "../../../shared/geo/index.js";

const PUBLIC_TRANSPORT_STATIONS = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL("../data/public-transport.stations.json", import.meta.url),
    ),
    "utf8",
  ),
);

export const loadStaticTransitPlaces = ({ origin, fetchRadiusMeters }) =>
  PUBLIC_TRANSPORT_STATIONS.filter((station) => {
    const distanceMeters = haversineDistanceMeters(origin, {
      lat: station.lat,
      lng: station.lng,
    });

    return distanceMeters <= fetchRadiusMeters;
  }).map((station) => ({
    id: station.id,
    name: station.name,
    lat: station.lat,
    lng: station.lng,
    category: "public_transport",
    mode: station.mode,
    line: station.line,
  }));
