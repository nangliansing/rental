import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import { patchAdminReportListingInQueries } from "./adminReportListingCache"

const listingId = "listing-1"

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

function listing(extra: Record<string, unknown> = {}) {
  return {
    _id: listingId,
    visibility: "PUBLIC",
    isDeleted: false,
    listedBy: "owner-1",
    ...extra,
  }
}

describe("patchAdminReportListingInQueries", () => {
  it("marks nested report listing projections deleted and private", () => {
    const queryClient = createQueryClient()
    const reportKey = queryKeys.admin.reports.detail("report-1")
    queryClient.setQueryData(reportKey, {
      _id: "report-1",
      listing: listing(),
    })

    patchAdminReportListingInQueries(queryClient, [reportKey], listingId)

    expect(queryClient.getQueryData(reportKey)).toMatchObject({
      listing: {
        _id: listingId,
        isDeleted: true,
        visibility: "PRIVATE",
      },
    })
  })

  it("merges server listing fields on reconcile", () => {
    const queryClient = createQueryClient()
    const reportKey = queryKeys.admin.reports.detail("report-1")
    queryClient.setQueryData(reportKey, {
      _id: "report-1",
      listing: listing({ visibility: "PUBLIC" }),
    })
    const serverListing = listing({
      visibility: "PUBLIC",
      deletedAt: "2026-07-22T00:00:00.000Z",
    })

    patchAdminReportListingInQueries(
      queryClient,
      [reportKey],
      listingId,
      serverListing,
    )

    expect(queryClient.getQueryData(reportKey)).toMatchObject({
      listing: {
        deletedAt: "2026-07-22T00:00:00.000Z",
        isDeleted: true,
        visibility: "PRIVATE",
      },
    })
  })

  it("does not patch unrelated records that only share the same _id", () => {
    const queryClient = createQueryClient()
    const key = queryKeys.admin.users.detail("user-1")
    const unrelated = { _id: listingId, email: "user@example.com" }
    queryClient.setQueryData(key, unrelated)

    patchAdminReportListingInQueries(queryClient, [key], listingId)

    expect(queryClient.getQueryData(key)).toEqual(unrelated)
  })

  it("patches every matching family without touching unrelated caches", () => {
    const queryClient = createQueryClient()
    const reportListKey = queryKeys.admin.reports.list({ status: "OPEN", limit: 20 })
    const unrelatedKey = queryKeys.listings.publicDetail("listing-2", "user-1")
    queryClient.setQueryData(reportListKey, {
      pages: [{ data: [{ _id: "report-1", listing: listing() }] }],
    })
    queryClient.setQueryData(unrelatedKey, {
      listing: listing({ _id: "listing-2" }),
    })

    patchAdminReportListingInQueries(
      queryClient,
      [reportListKey, unrelatedKey],
      listingId,
    )

    expect(queryClient.getQueryData(reportListKey)).toMatchObject({
      pages: [{ data: [{ listing: { isDeleted: true, visibility: "PRIVATE" } }] }],
    })
    expect(queryClient.getQueryData(unrelatedKey)).toMatchObject({
      listing: { _id: "listing-2", visibility: "PUBLIC" },
    })
  })

  it("leaves malformed cache values untouched instead of throwing", () => {
    const queryClient = createQueryClient()
    const key = queryKeys.admin.reports.detail("report-1")
    const malformed = { pages: [{ data: null }] }
    queryClient.setQueryData(key, malformed)

    expect(() =>
      patchAdminReportListingInQueries(queryClient, [key], listingId),
    ).not.toThrow()
    expect(queryClient.getQueryData(key)).toBe(malformed)
  })
})
