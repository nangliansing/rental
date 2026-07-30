import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

const mocks = vi.hoisted(() => ({ deleteAdminListing: vi.fn() }))

vi.mock("./deleteAdminListing", () => ({
  deleteAdminListing: mocks.deleteAdminListing,
  isAdminListingNotFoundError: (error: unknown) =>
    (error as { status?: number }).status === 404,
}))

import { useDeleteAdminListing } from "./useDeleteAdminListing"

const listing = {
  _id: "listing-1",
  visibility: "PUBLIC",
  isDeleted: false,
  listedBy: "owner-1",
  buildingId: "building-1",
}

const variables = {
  listingId: "listing-1",
  reportId: "report-1",
  agentProfileId: "profile-1",
  listingOwnerUserId: "owner-1",
  buildingId: "building-1",
  reason: "Violation",
}

function setup(currentUserId = "admin-1") {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const ownerKey = queryKeys.listings.ownerList({
    filter: "all",
    sort: "latest",
    limit: 20,
  })
  const savedKey = queryKeys.savedListings.list({ limit: 20 })
  const reportKey = queryKeys.admin.reports.detail("report-1")
  queryClient.setQueryData(ownerKey, {
    pageParams: [1],
    pages: [
      {
        data: [listing],
        pagination: { page: 1, limit: 20, total: 1 },
      },
    ],
  })
  queryClient.setQueryData(savedKey, {
    savedListings: [
      { _id: "saved-1", listingId: "listing-1", listing },
    ],
  })
  queryClient.setQueryData(reportKey, { _id: "report-1", listing })
  queryClient.setQueryData(queryKeys.profiles.me, { untouched: true })

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  return {
    ...renderHook(() => useDeleteAdminListing(currentUserId), {
      wrapper: Wrapper,
    }),
    ownerKey,
    queryClient,
    reportKey,
    savedKey,
  }
}

describe("useDeleteAdminListing", () => {
  beforeEach(() => {
    mocks.deleteAdminListing.mockReset()
  })

  it("optimistically removes listing projections and marks admin report data", async () => {
    let resolve!: (value: unknown) => void
    mocks.deleteAdminListing.mockReturnValue(
      new Promise((done) => {
        resolve = done
      }),
    )
    const { result, queryClient, ownerKey, savedKey, reportKey } = setup()

    act(() => result.current.mutate(variables))

    await waitFor(() =>
      expect(
        queryClient.getQueryData<{ pages: Array<{ data: unknown[] }> }>(ownerKey)
          ?.pages[0].data,
      ).toEqual([]),
    )
    expect(queryClient.getQueryData(savedKey)).toMatchObject({
      savedListings: [{ listing: null }],
    })
    expect(queryClient.getQueryData(reportKey)).toMatchObject({
      listing: { isDeleted: true, visibility: "PRIVATE" },
    })

    await act(async () => resolve(null))
  })

  it("restores every optimistic cache on genuine error", async () => {
    mocks.deleteAdminListing.mockRejectedValue(new Error("Network error"))
    const { result, queryClient, ownerKey, savedKey, reportKey } = setup()

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(
      queryClient.getQueryData<{ pages: Array<{ data: unknown[] }> }>(ownerKey)
        ?.pages[0].data,
    ).toHaveLength(1)
    expect(queryClient.getQueryData(savedKey)).toMatchObject({
      savedListings: [{ listing: { _id: "listing-1" } }],
    })
    expect(queryClient.getQueryData(reportKey)).toMatchObject({
      listing: { isDeleted: false },
    })
  })

  it("keeps deletion on not-found and invalidates identified projections", async () => {
    mocks.deleteAdminListing.mockRejectedValue(
      new ApiError("Missing", 404, "LISTING_NOT_FOUND"),
    )
    const { result, queryClient, ownerKey } = setup("owner-1")
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(
      queryClient.getQueryData<{ pages: Array<{ data: unknown[] }> }>(ownerKey)
        ?.pages[0].data,
    ).toEqual([])
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.profiles.me,
      refetchType: "active",
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.buildings.detail("building-1"),
      refetchType: "active",
    })
  })

  it("serializes repeated admin deletions", async () => {
    let resolveFirst!: (value: null) => void
    mocks.deleteAdminListing.mockImplementation(
      ({ listingId }: { listingId: string }) =>
        listingId === "listing-1"
          ? new Promise<null>((resolve) => {
              resolveFirst = resolve
            })
          : Promise.resolve(null),
    )
    const { result } = setup()

    act(() => {
      result.current.mutate(variables)
      result.current.mutate({ ...variables, listingId: "listing-2" })
    })
    await waitFor(() =>
      expect(mocks.deleteAdminListing).toHaveBeenCalledTimes(1),
    )
    await act(async () => resolveFirst(null))
    await waitFor(() =>
      expect(mocks.deleteAdminListing).toHaveBeenCalledTimes(2),
    )
  })
})
