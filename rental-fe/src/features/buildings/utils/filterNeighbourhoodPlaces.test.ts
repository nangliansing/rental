import { describe, expect, it } from "vitest"

import type { NeighbourhoodPlace } from "../api/getBuildingNeighbourhood"
import { NEIGHBOURHOOD_ALL_CATEGORY_KEY } from "../constants/neighbourhood"
import { filterNeighbourhoodPlaces } from "./filterNeighbourhoodPlaces"

const samplePlaces: NeighbourhoodPlace[] = [
  {
    id: "place-1",
    name: "7-Eleven",
    lat: 13.76,
    lng: 100.64,
    category: "convenience",
    distanceMeters: 120,
  },
  {
    id: "place-2",
    name: "Local Cafe",
    lat: 13.761,
    lng: 100.641,
    category: "cafe",
    distanceMeters: 240,
  },
  {
    id: "place-3",
    name: "Big C",
    lat: 13.762,
    lng: 100.642,
    category: "supermarket",
    distanceMeters: 480,
  },
]

describe("filterNeighbourhoodPlaces", () => {
  it("returns all places for the all category", () => {
    expect(
      filterNeighbourhoodPlaces(samplePlaces, NEIGHBOURHOOD_ALL_CATEGORY_KEY),
    ).toEqual(samplePlaces)
  })

  it("filters places by category key", () => {
    expect(filterNeighbourhoodPlaces(samplePlaces, "cafe")).toEqual([
      samplePlaces[1],
    ])
    expect(filterNeighbourhoodPlaces(samplePlaces, "supermarket")).toEqual([
      samplePlaces[2],
    ])
  })

  it("returns an empty list when no places match the category", () => {
    expect(filterNeighbourhoodPlaces(samplePlaces, "hospital")).toEqual([])
  })
})
