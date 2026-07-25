import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

const mocks = vi.hoisted(() => ({ deleteSavedListing: vi.fn() }))
vi.mock("../api", () => ({
  deleteSavedListing: mocks.deleteSavedListing,
  isSavedListingNotFoundError: (error: unknown) =>
    (error as { code?: string }).code === "SAVED_LISTING_NOT_FOUND",
}))

import { useDeleteSavedListing } from "./useDeleteSavedListing"

const variables = { listingId: "listing-1" }

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const savedKey = queryKeys.savedListings.list({ limit: 20 })
  const publicKey = queryKeys.listings.publicDetail("listing-1", "user-1")
  const unrelatedKey = queryKeys.notifications.me
  const savedData = {
    pages: [{
      data: {
        savedListings: [
          { _id: "saved-1", listingId: "listing-1" },
          { _id: "saved-2", listingId: "listing-2" },
        ],
      },
      pagination: { page: 1, limit: 20, total: 2 },
    }],
    pageParams: [1],
  }
  const publicData = {
    listing: { _id: "listing-1", rent: 9000, isSavedByMe: true },
  }
  queryClient.setQueryData(savedKey, savedData)
  queryClient.setQueryData(publicKey, publicData)
  queryClient.setQueryData(unrelatedKey, { unreadCount: 2 })

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  return {
    ...renderHook(() => useDeleteSavedListing(), { wrapper: Wrapper }),
    publicData,
    publicKey,
    queryClient,
    savedData,
    savedKey,
    unrelatedKey,
  }
}

describe("useDeleteSavedListing", () => {
  beforeEach(() => {
    mocks.deleteSavedListing.mockReset()
  })

  it("optimistically reconciles all related central cache families", async () => {
    let resolve!: (value: unknown) => void
    mocks.deleteSavedListing.mockImplementation(
      () => new Promise((done) => { resolve = done }),
    )
    const { result, queryClient, savedKey, publicKey, unrelatedKey } = setup()
    const cancel = vi.spyOn(queryClient, "cancelQueries")

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(mocks.deleteSavedListing).toHaveBeenCalledOnce())

    expect(cancel).toHaveBeenCalledTimes(7)
    expect(queryClient.getQueryData(savedKey)).toMatchObject({
      pages: [{
        data: { savedListings: [{ listingId: "listing-2" }] },
        pagination: { total: 1 },
      }],
    })
    expect(queryClient.getQueryData(publicKey)).toMatchObject({
      listing: { isSavedByMe: false },
    })
    expect(queryClient.getQueryData(unrelatedKey)).toEqual({ unreadCount: 2 })

    await act(async () => resolve({ success: true }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("restores every exact snapshot after a genuine failure", async () => {
    mocks.deleteSavedListing.mockRejectedValue(new Error("Network error"))
    const {
      result,
      queryClient,
      savedKey,
      savedData,
      publicKey,
      publicData,
    } = setup()

    await expect(
      act(async () => result.current.mutateAsync(variables)),
    ).rejects.toThrow("Network error")

    expect(queryClient.getQueryData(savedKey)).toEqual(savedData)
    expect(queryClient.getQueryData(publicKey)).toEqual(publicData)
  })

  it("treats an already-missing saved item as successful deletion", async () => {
    mocks.deleteSavedListing.mockRejectedValue(
      new ApiError("Missing", 404, "SAVED_LISTING_NOT_FOUND"),
    )
    const { result, queryClient, savedKey } = setup()

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(savedKey)).toMatchObject({
      pages: [{ data: { savedListings: [{ listingId: "listing-2" }] } }],
    })
  })

  it("does not invalidate safely reconciled query families", async () => {
    mocks.deleteSavedListing.mockResolvedValue({ success: true })
    const { result, queryClient } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidate).not.toHaveBeenCalled()
  })
})
