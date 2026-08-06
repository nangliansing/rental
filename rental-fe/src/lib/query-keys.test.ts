import { readFileSync, readdirSync } from "node:fs"
import { extname, join } from "node:path"

import { describe, expect, it } from "vitest"

import { queryKeys } from "./query-keys"

function expectMemberOf(
  family: readonly unknown[],
  member: readonly unknown[],
) {
  expect(member.slice(0, family.length)).toEqual(family)
}

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) return collectSourceFiles(path)
    if (![".ts", ".tsx"].includes(extname(entry.name))) return []
    if (entry.name.includes(".test.") || entry.name.includes(".spec.")) return []
    return [path]
  })
}

describe("queryKeys", () => {
  it("preserves existing list-key shapes", () => {
    expect(
      queryKeys.listings.ownerList({
        filter: "now",
        sort: "latest",
        limit: 20,
      }),
    ).toEqual(["owner-listings", "now", "latest", 20])

    expect(
      queryKeys.savedListings.list({ limit: 20 }),
    ).toEqual(["saved-listings", 20])

    expect(
      queryKeys.buildingFollows.list({ userId: "user-1", limit: 20 }),
    ).toEqual(["building-follows", "user-1", 20])

    expect(
      queryKeys.buildingFollows.buildingList({
        buildingId: "building-1",
        limit: 20,
      }),
    ).toEqual(["building-follows", "building", "building-1", 20])
  })

  it("provides prefixes for all viewer-specific listing details", () => {
    const prefix = queryKeys.listings.publicListingDetails("listing-1")
    const exact = queryKeys.listings.publicDetail("listing-1", "viewer-1")

    expect(exact.slice(0, prefix.length)).toEqual(prefix)
    expect(exact).toEqual(["public-listing", "listing-1", "viewer-1"])
  })

  it("keeps list and detail branches distinct", () => {
    expect(queryKeys.admin.reports.list("open")).toEqual([
      "admin-reports",
      "open",
    ])
    expect(queryKeys.admin.reports.detail("report-1")).toEqual([
      "admin-report",
      "report-1",
    ])
  })

  it("builds exact keys from stable family prefixes", () => {
    expectMemberOf(
      queryKeys.profiles.details,
      queryKeys.profiles.detail("profile-1"),
    )
    expectMemberOf(
      queryKeys.listings.ownerLists,
      queryKeys.listings.ownerList({
        filter: "now",
        sort: "latest",
        limit: 20,
      }),
    )
    expectMemberOf(
      queryKeys.admin.reports.lists,
      queryKeys.admin.reports.list("open"),
    )
    expectMemberOf(
      queryKeys.admin.reports.details,
      queryKeys.admin.reports.detail("report-1"),
    )
  })

  it("exposes explicit all/list/detail family keys", () => {
    expect(queryKeys.savedListings.all).toBe(queryKeys.savedListings.lists)
    expect(queryKeys.buildingFollows.all).toBe(queryKeys.buildingFollows.lists)
    expect(queryKeys.listerReviews.all).toBe(queryKeys.listerReviews.lists)
    expect(queryKeys.agentListings.all).toBe(queryKeys.agentListings.lists)
    expect(queryKeys.buildings.all).toBe(queryKeys.buildings.details)
    expect(queryKeys.admin.platformAdmins.all).toBe(
      queryKeys.admin.platformAdmins.lists,
    )
    expect(queryKeys.admin.platformAdmins.list).toBe(
      queryKeys.admin.platformAdmins.lists,
    )
  })

  it("normalizes anonymous public-listing viewers", () => {
    expect(queryKeys.listings.publicDetail("listing-1", null)).toEqual([
      "public-listing",
      "listing-1",
      "anonymous",
    ])
  })

  it("groups every building-search mode under one mutation prefix", () => {
    const prefix = queryKeys.mapSearch.buildings
    const area = queryKeys.mapSearch.buildingResults({
      bounds: { north: 14 },
      filters: {},
      limit: 20,
    })
    const nearby = queryKeys.mapSearch.nearbyBuildingResults({
      position: { lat: 13.7, lng: 100.6 },
      radiusMeters: 500,
      filters: {},
      limit: 20,
    })
    const nearLines = queryKeys.mapSearch.nearLinesBuildingResults({
      geometry: {
        type: "LineString",
        coordinates: [
          [100.6, 13.7],
          [100.7, 13.8],
        ],
      },
      distanceMeters: 500,
      filters: {},
      limit: 20,
    })

    expect(area.slice(0, prefix.length)).toEqual(prefix)
    expect(nearby.slice(0, prefix.length)).toEqual(prefix)
    expect(nearLines.slice(0, prefix.length)).toEqual(prefix)
  })

  it("preserves the complete production key contract", () => {
    const cases: Array<{
      actual: readonly unknown[]
      expected: readonly unknown[]
    }> = [
      { actual: queryKeys.auth.currentUser, expected: ["current-user"] },
      { actual: queryKeys.profiles.me, expected: ["agent-profiles", "me"] },
      {
        actual: queryKeys.profiles.detail("profile-1"),
        expected: ["agent-profiles", "detail", "profile-1"],
      },
      {
        actual: queryKeys.notifications.me,
        expected: ["notifications", "me"],
      },
      {
        actual: queryKeys.pendingPosts.ownerList({
          status: "PENDING",
          limit: 10,
        }),
        expected: ["owner-pending-posts", "PENDING", 10],
      },
      {
        actual: queryKeys.savedSearches.ownerList({
          status: "Waiting",
          limit: 10,
        }),
        expected: ["owner-saved-searches", "Waiting", 10],
      },
      {
        actual: queryKeys.savedSearches.ownerDetail("request-1"),
        expected: ["owner-saved-search", "request-1"],
      },
      {
        actual: queryKeys.savedListings.list({ limit: 10 }),
        expected: ["saved-listings", 10],
      },
      {
        actual: queryKeys.buildingFollows.list({ userId: "user-1", limit: 10 }),
        expected: ["building-follows", "user-1", 10],
      },
      {
        actual: queryKeys.listerReviews.list({
          listerProfileId: "profile-1",
          sort: "latest",
          limit: 10,
        }),
        expected: ["lister-reviews", "profile-1", "latest", 10],
      },
      {
        actual: queryKeys.listerReviewTeasers.list({
          listerProfileId: "profile-1",
          sort: "latest",
          limit: 3,
        }),
        expected: ["lister-review-teasers", "profile-1", "latest", 3],
      },
      {
        actual: queryKeys.agentListings.list({
          agentProfileId: "profile-1",
          filter: "now",
          sort: "latest",
          limit: 10,
        }),
        expected: ["agent-listings", "profile-1", "now", "latest", 10],
      },
      {
        actual: queryKeys.buildings.detail("building-1"),
        expected: ["building", "building-1"],
      },
      {
        actual: queryKeys.buildings.neighbourhood("building-1", {
          radiusM: 500,
          fetchRadiusM: 1_000,
        }),
        expected: [
          "building",
          "building-1",
          "neighbourhood",
          500,
          1_000,
        ],
      },
      {
        actual: queryKeys.mapSearch.buildingResults({
          bounds: { north: 14 },
          filters: { bedrooms: 2 },
          limit: 20,
          includeBuildingsWithoutMatchingListings: true,
        }),
        expected: [
          "building-search",
          "area",
          { north: 14 },
          { bedrooms: 2 },
          20,
          true,
        ],
      },
      {
        actual: queryKeys.mapSearch.nearbyBuildingResults({
          position: { lat: 13.7, lng: 100.6 },
          radiusMeters: 500,
          filters: { bedrooms: 2 },
          limit: 20,
        }),
        expected: [
          "building-search",
          "nearby",
          { lat: 13.7, lng: 100.6 },
          500,
          { bedrooms: 2 },
          20,
          undefined,
        ],
      },
      {
        actual: queryKeys.mapSearch.nearLinesBuildingResults({
          geometry: { type: "LineString" },
          distanceMeters: 300,
          filters: {},
          limit: 20,
        }),
        expected: [
          "building-search",
          "near-lines",
          { type: "LineString" },
          300,
          {},
          20,
          undefined,
        ],
      },
      {
        actual: queryKeys.mapSearch.listingsInBuildingResults({
          buildingId: "building-1",
          filters: { bedrooms: 2 },
          limit: 20,
        }),
        expected: [
          "search-listings-in-building",
          "building-1",
          { bedrooms: 2 },
          20,
        ],
      },
      {
        actual: queryKeys.listings.ownerDetail("listing-1"),
        expected: ["owner-listing", "listing-1"],
      },
      {
        actual: queryKeys.listings.publicDetail("listing-1", "viewer-1"),
        expected: ["public-listing", "listing-1", "viewer-1"],
      },
      {
        actual: queryKeys.admin.pendingPosts.list("PENDING"),
        expected: ["admin-pending-posts", "PENDING"],
      },
      {
        actual: queryKeys.admin.buildingEditRequests.detail("request-1"),
        expected: ["admin-building-edit-request", "request-1"],
      },
      {
        actual: queryKeys.admin.reports.detail("report-1"),
        expected: ["admin-report", "report-1"],
      },
      {
        actual: queryKeys.admin.reviewReports.detail("report-1"),
        expected: ["admin-review-report", "report-1"],
      },
      {
        actual: queryKeys.admin.suspensions.detail("suspension-1"),
        expected: ["admin-suspension", "suspension-1"],
      },
      {
        actual: queryKeys.admin.users.detail("user-1"),
        expected: ["admin-user", "user-1"],
      },
    ]

    cases.forEach(({ actual, expected }) => {
      expect(actual).toEqual(expected)
    })
  })

  it("keeps every exact list and detail key inside its declared family", () => {
    const cases: Array<{
      family: readonly unknown[]
      member: readonly unknown[]
    }> = [
      {
        family: queryKeys.pendingPosts.ownerLists,
        member: queryKeys.pendingPosts.ownerList({
          status: "PENDING",
          limit: 10,
        }),
      },
      {
        family: queryKeys.savedSearches.ownerLists,
        member: queryKeys.savedSearches.ownerList({
          status: "Waiting",
          limit: 10,
        }),
      },
      {
        family: queryKeys.savedSearches.ownerDetails,
        member: queryKeys.savedSearches.ownerDetail("request-1"),
      },
      {
        family: queryKeys.savedListings.lists,
        member: queryKeys.savedListings.list({ limit: 10 }),
      },
      {
        family: queryKeys.buildingFollows.byUser("user-1"),
        member: queryKeys.buildingFollows.list({ userId: "user-1", limit: 10 }),
      },
      {
        family: queryKeys.listerReviews.byLister("profile-1"),
        member: queryKeys.listerReviews.list({
          listerProfileId: "profile-1",
          sort: "latest",
          limit: 10,
        }),
      },
      {
        family: queryKeys.listerReviewTeasers.byLister("profile-1"),
        member: queryKeys.listerReviewTeasers.list({
          listerProfileId: "profile-1",
          sort: "latest",
          limit: 3,
        }),
      },
      {
        family: queryKeys.agentListings.lists,
        member: queryKeys.agentListings.list({
          agentProfileId: "profile-1",
          filter: "all",
          sort: "latest",
          limit: 10,
        }),
      },
      {
        family: queryKeys.buildings.details,
        member: queryKeys.buildings.detail("building-1"),
      },
      {
        family: queryKeys.listings.ownerDetails,
        member: queryKeys.listings.ownerDetail("listing-1"),
      },
      {
        family: queryKeys.listings.publicListingDetails("listing-1"),
        member: queryKeys.listings.publicDetail("listing-1", "viewer-1"),
      },
      {
        family: queryKeys.admin.pendingPosts.lists,
        member: queryKeys.admin.pendingPosts.list("PENDING"),
      },
      {
        family: queryKeys.admin.buildingEditRequests.details,
        member: queryKeys.admin.buildingEditRequests.detail("request-1"),
      },
      {
        family: queryKeys.admin.reports.details,
        member: queryKeys.admin.reports.detail("report-1"),
      },
      {
        family: queryKeys.admin.reviewReports.details,
        member: queryKeys.admin.reviewReports.detail("report-1"),
      },
      {
        family: queryKeys.admin.suspensions.details,
        member: queryKeys.admin.suspensions.detail("suspension-1"),
      },
      {
        family: queryKeys.admin.users.details,
        member: queryKeys.admin.users.detail("user-1"),
      },
    ]

    cases.forEach(({ family, member }) => expectMemberOf(family, member))
  })

  it("is deterministic, parameter-sensitive, and JSON-safe", () => {
    const input = {
      filter: "now",
      sort: "latest",
      limit: 20,
    } as const
    const first = queryKeys.listings.ownerList(input)
    const second = queryKeys.listings.ownerList({ ...input })
    const different = queryKeys.listings.ownerList({
      ...input,
      limit: 40,
    })

    expect(first).toEqual(second)
    expect(first).not.toEqual(different)
    expect(() => JSON.stringify(first)).not.toThrow()
    expect(JSON.parse(JSON.stringify(first))).toEqual(first)
  })

  it("does not mutate object parameters", () => {
    const bounds = Object.freeze({ north: 14, south: 13 })
    const filters = Object.freeze({ bedrooms: 2 })

    expect(() =>
      queryKeys.mapSearch.buildingResults({
        bounds,
        filters,
        limit: 20,
      }),
    ).not.toThrow()
    expect(bounds).toEqual({ north: 14, south: 13 })
    expect(filters).toEqual({ bedrooms: 2 })
  })

  it("keeps viewer and list variants in separate cache entries", () => {
    expect(queryKeys.listings.publicDetail("listing-1", "viewer-1")).not.toEqual(
      queryKeys.listings.publicDetail("listing-1", "viewer-2"),
    )
    expect(queryKeys.listings.publicDetail("listing-1", null)).toEqual(
      queryKeys.listings.publicDetail("listing-1", undefined),
    )
    expect(
      queryKeys.listerReviews.list({
        listerProfileId: "profile-1",
        sort: "latest",
        limit: 10,
      }),
    ).not.toEqual(
      queryKeys.listerReviews.list({
        listerProfileId: "profile-1",
        sort: "oldest",
        limit: 10,
      }),
    )
  })

  it("does not define inline query-key arrays in production source", () => {
    const sourceRoot = join(process.cwd(), "src")
    const violations = collectSourceFiles(sourceRoot)
      .filter(path => !path.endsWith("query-keys.ts"))
      .flatMap(path => {
        const source = readFileSync(path, "utf8")
        const hasInlineQueryKey = /queryKey\s*:\s*\[/.test(source)
        const hasInlineCacheKey =
          /\.(?:setQueryData|getQueryData|invalidateQueries|cancelQueries|removeQueries)\(\s*\[/.test(
            source,
          )
        return hasInlineQueryKey || hasInlineCacheKey ? [path] : []
      })

    expect(violations).toEqual([])
  })
})
