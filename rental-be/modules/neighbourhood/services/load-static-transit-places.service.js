import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { haversineDistanceMeters } from "../../../shared/geo/index.js";

export const PUBLIC_TRANSPORT_STATIONS = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL("../data/public-transport.stations.json", import.meta.url),
    ),
    "utf8",
  ),
);

const STATIC_TRANSIT_MATCH_RADIUS_METERS = 150;

export const findNearbyStaticTransitStation = ({
  lat,
  lng,
  maxDistanceMeters = STATIC_TRANSIT_MATCH_RADIUS_METERS,
}) => {
  let nearestStation = null;
  let nearestDistanceMeters = Number.POSITIVE_INFINITY;

  for (const station of PUBLIC_TRANSPORT_STATIONS) {
    const distanceMeters = haversineDistanceMeters(
      { lat, lng },
      { lat: station.lat, lng: station.lng },
    );

    if (
      distanceMeters <= maxDistanceMeters &&
      distanceMeters < nearestDistanceMeters
    ) {
      nearestStation = station;
      nearestDistanceMeters = distanceMeters;
    }
  }

  return nearestStation;
};

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
