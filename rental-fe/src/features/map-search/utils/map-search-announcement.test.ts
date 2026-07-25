import { describe, expect, it } from "vitest"

import { getMapSearchAnnouncement } from "./map-search-announcement"
import {
  getSearchResultScopePhrase,
  getStaleSearchAnnouncement,
} from "./map-search-presentation"

const SOURCES = ["area", "nearby", "line"] as const

describe("getMapSearchAnnouncement", () => {
  it.each(SOURCES)(
    "announces loading state for %s search",
    (source) => {
      expect(
        getMapSearchAnnouncement({
          status: "loading",
          source,
          buildingCount: 0,
        }),
      ).toBe(`Searching for buildings ${getSearchResultScopePhrase(source)}.`)
    },
  )

  it.each(SOURCES)(
    "announces stale state for %s search",
    (source) => {
      expect(
        getMapSearchAnnouncement({
          status: "stale",
          source,
          buildingCount: 0,
        }),
      ).toBe(getStaleSearchAnnouncement(source))
    },
  )

  it.each(SOURCES)(
    "announces empty results for %s search",
    (source) => {
      expect(
        getMapSearchAnnouncement({
          status: "empty",
          source,
          buildingCount: 0,
        }),
      ).toBe(`No buildings found ${getSearchResultScopePhrase(source)}.`)
    },
  )

  it.each(SOURCES)(
    "announces success with plural count for %s search",
    (source) => {
      expect(
        getMapSearchAnnouncement({
          status: "success",
          source,
          buildingCount: 3,
        }),
      ).toBe(`3 buildings found ${getSearchResultScopePhrase(source)}.`)
    },
  )

  it("announces success with singular count near the pin", () => {
    expect(
      getMapSearchAnnouncement({
        status: "success",
        source: "nearby",
        buildingCount: 1,
      }),
    ).toBe("1 building found near the pin.")
  })

  it("announces line search success with correct scope", () => {
    expect(
      getMapSearchAnnouncement({
        status: "success",
        source: "line",
        buildingCount: 2,
      }),
    ).toBe("2 buildings found along the search line.")
  })

  it.each(SOURCES)(
    "explains that retained results remain available after refresh failure for %s search",
    (source) => {
      expect(
        getMapSearchAnnouncement({
          status: "error",
          source,
          buildingCount: 8,
        }),
      ).toBe("The search could not be updated. Showing 8 buildings.")
    },
  )

  it.each(SOURCES)(
    "announces a hard failure when no previous results exist for %s search",
    (source) => {
      expect(
        getMapSearchAnnouncement({
          status: "error",
          source,
          buildingCount: 0,
        }),
      ).toBe("The building search failed. Try again.")
    },
  )

  it("returns an empty announcement for idle state", () => {
    expect(
      getMapSearchAnnouncement({
        status: "idle",
        source: "area",
        buildingCount: 0,
      }),
    ).toBe("")
  })
})
