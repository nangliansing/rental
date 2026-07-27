import { http, HttpResponse } from "msw"

import type { BuildingNeighbourhood } from "../../api/getBuildingNeighbourhood"
import { server } from "@/test/server"

export const NEIGHBOURHOOD_EXPLORE_TEST_BUILDING_ID = "building-1"

export const sampleNeighbourhoodExploreData: BuildingNeighbourhood = {
  buildingId: NEIGHBOURHOOD_EXPLORE_TEST_BUILDING_ID,
  origin: { lat: 13.765, lng: 100.641 },
  radiusMeters: 1000,
  fetchRadiusMeters: 2000,
  fetchedAt: "2026-07-26T19:17:15.805Z",
  cacheStatus: "hit",
  source: "openstreetmap",
  summary: {
    all: 3,
    convenience: 1,
    cafe: 1,
    restaurant: 1,
  },
  categories: [
    { key: "convenience", label: "Convenience Stores", priority: 2, count: 1 },
    { key: "cafe", label: "Cafes", priority: 5, count: 1 },
    { key: "restaurant", label: "Restaurants", priority: 4, count: 1 },
  ],
  places: [
    {
      id: "place-convenience",
      name: "7-Eleven",
      lat: 13.761819,
      lng: 100.640989,
      category: "convenience",
      distanceMeters: 354,
    },
    {
      id: "place-cafe",
      name: "Local Cafe",
      lat: 13.762,
      lng: 100.641,
      category: "cafe",
      distanceMeters: 420,
    },
    {
      id: "place-restaurant",
      name: "Thai Kitchen",
      lat: 13.763,
      lng: 100.642,
      category: "restaurant",
      distanceMeters: 510,
    },
  ],
}

export function mockNeighbourhoodExploreResponse(
  data: BuildingNeighbourhood = sampleNeighbourhoodExploreData,
) {
  server.use(
    http.get("/api/v1/buildings/:buildingId/neighbourhood", () =>
      HttpResponse.json({ success: true, data }),
    ),
  )
}
