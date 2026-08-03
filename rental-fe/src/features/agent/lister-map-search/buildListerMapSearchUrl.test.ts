import { describe, expect, it } from "vitest"

import { DEFAULT_MAP_SEARCH_FILTERS } from "@/features/map-search/context/MapSearchFilterContext"
import { parseMapSearchUrl } from "@/features/map-search/utils/map-search-url"

import { buildListerMapSearchUrl } from "./buildListerMapSearchUrl"

function parseBuiltUrl(url: string) {
  expect(url.startsWith("/?")).toBe(true)
  return new URLSearchParams(url.slice(2))
}

function parseBuiltFilters(url: string) {
  const params = parseBuiltUrl(url)
  return JSON.parse(params.get("filters") ?? "{}") as Record<string, unknown>
}

describe("buildListerMapSearchUrl", () => {
  it("builds a filters-only map search URL with the lister id", () => {
    const url = buildListerMapSearchUrl("agent-1")
    const params = parseBuiltUrl(url)

    expect(parseBuiltFilters(url)).toMatchObject({
      agentProfileIds: ["agent-1"],
      minRent: DEFAULT_MAP_SEARCH_FILTERS.minRent,
      maxRent: DEFAULT_MAP_SEARCH_FILTERS.maxRent,
      isForeignerAccepted: DEFAULT_MAP_SEARCH_FILTERS.isForeignerAccepted,
    })
    expect(params.get("search")).toBeNull()
    expect(params.get("lat")).toBeNull()
    expect(params.get("lng")).toBeNull()
    expect(params.get("line")).toBeNull()
    expect(params.get("building")).toBeNull()
    expect(params.get("listing")).toBeNull()
  })

  it("returns home for blank, empty, and whitespace-only ids", () => {
    expect(buildListerMapSearchUrl("")).toBe("/")
    expect(buildListerMapSearchUrl("   ")).toBe("/")
    expect(buildListerMapSearchUrl("\t\n")).toBe("/")
  })

  it("returns home for non-string runtime values", () => {
    expect(buildListerMapSearchUrl(null as unknown as string)).toBe("/")
    expect(buildListerMapSearchUrl(undefined as unknown as string)).toBe("/")
    expect(buildListerMapSearchUrl(123 as unknown as string)).toBe("/")
  })

  it("trims surrounding whitespace from the lister id in the URL", () => {
    const url = buildListerMapSearchUrl("  agent-42  ")

    expect(parseBuiltFilters(url).agentProfileIds).toEqual(["agent-42"])
  })

  it("preserves internal spaces in the lister id after edge trimming", () => {
    const url = buildListerMapSearchUrl("  agent with spaces  ")

    expect(parseBuiltFilters(url).agentProfileIds).toEqual(["agent with spaces"])
  })

  it("supports object-id style lister ids", () => {
    const objectId = "507f1f77bcf86cd799439011"
    const url = buildListerMapSearchUrl(objectId)

    expect(parseBuiltFilters(url).agentProfileIds).toEqual([objectId])
  })

  it("stores exactly one lister id and does not set listerIds alias", () => {
    const filters = parseBuiltFilters(buildListerMapSearchUrl("agent-1"))

    expect(filters.agentProfileIds).toEqual(["agent-1"])
    expect(filters.listerIds).toBeUndefined()
  })

  it("round-trips through parseMapSearchUrl with idle search state", () => {
    const url = buildListerMapSearchUrl("agent-1")
    const params = parseBuiltUrl(url)
    const parsed = parseMapSearchUrl(params, {})

    expect(parsed.source).toBeNull()
    expect(parsed.bounds).toBeNull()
    expect(parsed.position).toBeNull()
    expect(parsed.linePoints).toEqual([])
    expect(parsed.buildingId).toBeNull()
    expect(parsed.listingId).toBeNull()
    expect(parsed.filters).toMatchObject({
      agentProfileIds: ["agent-1"],
      minRent: DEFAULT_MAP_SEARCH_FILTERS.minRent,
      maxRent: DEFAULT_MAP_SEARCH_FILTERS.maxRent,
      isForeignerAccepted: DEFAULT_MAP_SEARCH_FILTERS.isForeignerAccepted,
    })
  })

  it("returns a stable URL for the same lister id", () => {
    const first = buildListerMapSearchUrl("agent-1")
    const second = buildListerMapSearchUrl("agent-1")

    expect(first).toBe(second)
  })

  it("returns different URLs for different lister ids", () => {
    const first = buildListerMapSearchUrl("agent-1")
    const second = buildListerMapSearchUrl("agent-2")

    expect(first).not.toBe(second)
    expect(parseBuiltFilters(first).agentProfileIds).toEqual(["agent-1"])
    expect(parseBuiltFilters(second).agentProfileIds).toEqual(["agent-2"])
  })

  it("does not mutate a reused URLSearchParams instance", () => {
    const url = buildListerMapSearchUrl("agent-1")
    const again = buildListerMapSearchUrl("agent-2")

    expect(parseBuiltFilters(url).agentProfileIds).toEqual(["agent-1"])
    expect(parseBuiltFilters(again).agentProfileIds).toEqual(["agent-2"])
  })

  it("completes in bounded time for long lister ids", () => {
    const longId = "a".repeat(10_000)
    const startedAt = performance.now()

    const url = buildListerMapSearchUrl(longId)

    expect(performance.now() - startedAt).toBeLessThan(100)
    expect(parseBuiltFilters(url).agentProfileIds).toEqual([longId])
  })
})
