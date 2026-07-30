import { describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"
import { DEFAULT_LISTING_PAGE_SIZE } from "@/shared/constants/pagination"

import {
  ownerListingsQueryKey,
  ownerListingsQueryOptions,
} from "./useSearchOwnerListings"

vi.mock("./searchOwnerListings", () => ({
  searchOwnerListings: vi.fn(),
}))

describe("ownerListingsQueryOptions", () => {
  it("builds query keys from filter, sort, and limit", () => {
    expect(
      ownerListingsQueryKey({
        filter: "soon",
        sort: "oldest",
        limit: 10,
      }),
    ).toEqual(queryKeys.listings.ownerList({
      filter: "soon",
      sort: "oldest",
      limit: 10,
    }))
  })

  it("defaults to all/latest pagination settings", () => {
    const options = ownerListingsQueryOptions()

    expect(options.queryKey).toEqual(
      queryKeys.listings.ownerList({
        filter: "all",
        sort: "latest",
        limit: DEFAULT_LISTING_PAGE_SIZE,
      }),
    )
    expect(options.initialPageParam).toBe(1)
    expect(typeof options.getNextPageParam).toBe("function")
  })

  it("uses distinct cache entries per filter", () => {
    const all = ownerListingsQueryOptions({ filter: "all" })
    const now = ownerListingsQueryOptions({ filter: "now" })
    const soon = ownerListingsQueryOptions({ filter: "soon" })
    const privateListings = ownerListingsQueryOptions({ filter: "private" })

    expect(all.queryKey).not.toEqual(now.queryKey)
    expect(now.queryKey).not.toEqual(soon.queryKey)
    expect(soon.queryKey).not.toEqual(privateListings.queryKey)
  })

  it("respects enabled=false", () => {
    expect(ownerListingsQueryOptions({ enabled: false }).enabled).toBe(false)
  })
})
