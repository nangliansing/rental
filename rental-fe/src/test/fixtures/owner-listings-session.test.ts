import { describe, expect, it } from "vitest"

import {
  buildSmokeOwnerListings,
  filterSmokeOwnerListings,
  searchSmokeOwnerListings,
  sortSmokeOwnerListings,
  toSmokeOwnerListingAgentProfile,
} from "../../../e2e/fixtures/owner-listings-session"

const referenceDate = new Date("2026-07-30T12:00:00.000Z")
const listedBy = "user-smoke-1"
const agentProfile = toSmokeOwnerListingAgentProfile({
  _id: "agent-smoke-1",
  userId: listedBy,
  displayName: "Smoke Agent",
  phone: "+66812345678",
  supportLanguages: ["English"],
})

describe("sortSmokeOwnerListings", () => {
  const listings = buildSmokeOwnerListings({
    referenceDate,
    listedBy,
    agentProfile,
  })

  it("orders non-soon filters by createdAt descending for latest", () => {
    const sorted = sortSmokeOwnerListings(listings, "all", "latest")

    expect(sorted.map((listing) => listing._id)).toEqual([
      "listing-smoke-private",
      "listing-smoke-soon-later",
      "listing-smoke-soon",
      "listing-smoke-now",
      "listing-smoke-1",
    ])
  })

  it("orders non-soon filters by createdAt ascending for oldest", () => {
    const sorted = sortSmokeOwnerListings(listings, "all", "oldest")

    expect(sorted.map((listing) => listing._id)).toEqual([
      "listing-smoke-1",
      "listing-smoke-now",
      "listing-smoke-soon",
      "listing-smoke-soon-later",
      "listing-smoke-private",
    ])
  })

  it("prioritizes availableAt for soon regardless of createdAt", () => {
    const filtered = filterSmokeOwnerListings(
      listings,
      new URLSearchParams("filter=soon"),
      referenceDate,
    )
    const sorted = sortSmokeOwnerListings(filtered, "soon", "latest")

    expect(sorted.map((listing) => listing._id)).toEqual([
      "listing-smoke-soon",
      "listing-smoke-soon-later",
    ])
  })
})

describe("searchSmokeOwnerListings", () => {
  const listings = buildSmokeOwnerListings({
    referenceDate,
    listedBy,
    agentProfile,
  })

  it("applies filter, sort, and pagination together", () => {
    const result = searchSmokeOwnerListings(
      listings,
      new URLSearchParams("filter=now&sort=latest&page=1&limit=10"),
      referenceDate,
    )

    expect(result.items.map((listing) => listing._id)).toEqual(["listing-smoke-now"])
    expect(result.total).toBe(1)
  })
})
