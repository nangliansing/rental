import { describe, expect, it } from "vitest"

import type { NeighbourhoodPlace } from "../../api/getBuildingNeighbourhood"
import { pickNearestNeighbourhoodPlaces } from "./pickNearestNeighbourhoodPlaces"

function place(
  overrides: Partial<NeighbourhoodPlace> &
    Pick<NeighbourhoodPlace, "id" | "name" | "category" | "distanceMeters">,
): NeighbourhoodPlace {
  return {
    lat: 13.7,
    lng: 100.6,
    ...overrides,
  }
}

describe("pickNearestNeighbourhoodPlaces", () => {
  it("returns an empty list for invalid input", () => {
    expect(pickNearestNeighbourhoodPlaces(null)).toEqual([])
    expect(pickNearestNeighbourhoodPlaces({})).toEqual([])
    expect(pickNearestNeighbourhoodPlaces([null, "x", 1])).toEqual([])
  })

  it("picks the nearest place per group in stable order", () => {
    const nearest = pickNearestNeighbourhoodPlaces([
      place({
        id: "cafe-far",
        name: "Far Cafe",
        category: "cafe",
        distanceMeters: 800,
      }),
      place({
        id: "cafe-near",
        name: "Near Cafe",
        category: "cafe",
        distanceMeters: 120,
      }),
      place({
        id: "mrt",
        name: "Phetchaburi MRT",
        category: "public_transport",
        mode: "mrt",
        distanceMeters: 450,
      }),
      place({
        id: "bus",
        name: "Bus stop 12",
        category: "public_transport",
        mode: "bus",
        distanceMeters: 90,
      }),
      place({
        id: "ferry",
        name: "River pier",
        category: "public_transport",
        mode: "ferry",
        distanceMeters: 700,
      }),
      place({
        id: "restaurant",
        name: "Thai Kitchen",
        category: "restaurant",
        distanceMeters: 300,
      }),
      place({
        id: "mall",
        name: "Central Mall",
        category: "shopping_mall",
        distanceMeters: 900,
      }),
      place({
        id: "market",
        name: "Fresh Market",
        category: "market",
        distanceMeters: 500,
      }),
      place({
        id: "7eleven",
        name: "7-Eleven",
        category: "convenience",
        distanceMeters: 80,
      }),
      place({
        id: "supermarket",
        name: "Tops Market",
        category: "supermarket",
        distanceMeters: 640,
      }),
      place({
        id: "pharmacy",
        name: "Boots",
        category: "pharmacy",
        distanceMeters: 220,
      }),
      place({
        id: "gym",
        name: "Fitness First",
        category: "gym",
        distanceMeters: 50,
      }),
      place({
        id: "hospital",
        name: "Bumrungrad",
        category: "hospital",
        distanceMeters: 1100,
      }),
    ])

    expect(nearest.map((item) => item.groupId)).toEqual([
      "rail",
      "bus",
      "ferry",
      "cafe",
      "restaurant",
      "shopping_mall",
      "market",
      "convenience",
      "supermarket",
      "pharmacy",
      "gym",
      "hospital",
    ])
    expect(nearest.find((item) => item.groupId === "cafe")?.place.name).toBe(
      "Near Cafe",
    )
    expect(nearest.find((item) => item.groupId === "gym")?.place.name).toBe(
      "Fitness First",
    )
  })

  it("treats public transport without mode as rail", () => {
    const nearest = pickNearestNeighbourhoodPlaces([
      place({
        id: "station",
        name: "Local station",
        category: "public_transport",
        distanceMeters: 200,
      }),
    ])

    expect(nearest).toEqual([
      {
        groupId: "rail",
        groupLabel: "MRT / BTS",
        place: expect.objectContaining({ id: "station" }),
      },
    ])
  })

  it("skips places with invalid distances or names", () => {
    expect(
      pickNearestNeighbourhoodPlaces([
        place({
          id: "bad-distance",
          name: "Broken",
          category: "cafe",
          distanceMeters: Number.NaN,
        }),
        place({
          id: "blank-name",
          name: "   ",
          category: "cafe",
          distanceMeters: 100,
        }),
        place({
          id: "ok",
          name: "Good Cafe",
          category: "cafe",
          distanceMeters: 150,
        }),
      ]),
    ).toEqual([
      {
        groupId: "cafe",
        groupLabel: "Cafe",
        place: expect.objectContaining({ id: "ok" }),
      },
    ])
  })
})
