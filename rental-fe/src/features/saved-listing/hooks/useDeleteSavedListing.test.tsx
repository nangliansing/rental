import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

const mocks = vi.hoisted(() => ({
  createSavedListing: vi.fn(),
  deleteSavedListing: vi.fn(),
}))
vi.mock("../api", () => ({
  createSavedListing: mocks.createSavedListing,
  deleteSavedListing: mocks.deleteSavedListing,
  isSavedListingAlreadyExistsError: () => false,
  isSavedListingNotFoundError: (error: unknown) =>
    (error as { code?: string }).code === "SAVED_LISTING_NOT_FOUND",
}))

import { useDeleteSavedListing } from "./useDeleteSavedListing"
import { useOptimisticSavedListingToggle } from "./useOptimisticSavedListingToggle"

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
    mocks.createSavedListing.mockReset()
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

  it("does not call the endpoint or mutate caches when cancellation fails", async () => {
    const { result, queryClient, savedData, savedKey } = setup()
    vi.spyOn(queryClient, "cancelQueries").mockRejectedValueOnce(
      new Error("Cancellation failed"),
    )

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mocks.deleteSavedListing).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(savedKey)).toEqual(savedData)
  })

  it("reconciles cache entries recreated while deletion is pending", async () => {
    let resolve!: (value: unknown) => void
    mocks.deleteSavedListing.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const {
      result,
      queryClient,
      publicData,
      publicKey,
      savedData,
      savedKey,
    } = setup()

    act(() => result.current.mutate(variables))
    await waitFor(() =>
      expect(mocks.deleteSavedListing).toHaveBeenCalledOnce(),
    )

    queryClient.setQueryData(savedKey, savedData)
    queryClient.setQueryData(publicKey, publicData)
    await act(async () => resolve({ success: true }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(queryClient.getQueryData(savedKey)).toMatchObject({
      pages: [{
        data: { savedListings: [{ listingId: "listing-2" }] },
        pagination: { total: 1 },
      }],
    })
    expect(queryClient.getQueryData(publicKey)).toMatchObject({
      listing: { isSavedByMe: false },
    })
  })

  it("serializes removals that share saved-list pagination", async () => {
    let resolveFirst!: (value: unknown) => void
    mocks.deleteSavedListing
      .mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolveFirst = done
          }),
      )
      .mockResolvedValueOnce({ success: true })
    const { result } = setup()

    act(() => {
      result.current.mutate({ listingId: "listing-1" })
      result.current.mutate({ listingId: "listing-2" })
    })
    await waitFor(() =>
      expect(mocks.deleteSavedListing).toHaveBeenCalledTimes(1),
    )

    await act(async () => resolveFirst({ success: true }))
    await waitFor(() =>
      expect(mocks.deleteSavedListing).toHaveBeenCalledTimes(2),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("succeeds without creating cache entries after complete eviction", async () => {
    mocks.deleteSavedListing.mockResolvedValue({ success: true })
    const { result, queryClient, publicKey, savedKey } = setup()
    queryClient.clear()

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(
      queryClient.getQueryCache().find({ queryKey: savedKey, exact: true }),
    ).toBeUndefined()
    expect(
      queryClient.getQueryCache().find({ queryKey: publicKey, exact: true }),
    ).toBeUndefined()
  })

  it("serializes panel deletion with card-toggle writes", async () => {
    vi.useFakeTimers()
    let resolvePanelDelete!: (value: unknown) => void
    mocks.deleteSavedListing
      .mockImplementationOnce(
        () =>
          new Promise((done) => {
            resolvePanelDelete = done
          }),
      )
      .mockResolvedValueOnce({ success: true })
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false } },
    })

    function Wrapper({ children }: PropsWithChildren) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
    }

    try {
      const { result } = renderHook(
        () => ({
          panelDelete: useDeleteSavedListing(),
          toggle: useOptimisticSavedListingToggle({
            initialIsSaved: true,
            listingId: "listing-2",
          }),
        }),
        { wrapper: Wrapper },
      )

      act(() => result.current.panelDelete.mutate(variables))
      await act(async () => Promise.resolve())
      expect(mocks.deleteSavedListing).toHaveBeenCalledTimes(1)

      act(() => result.current.toggle.toggle())
      await act(async () => {
        vi.advanceTimersByTime(400)
        await Promise.resolve()
      })
      expect(mocks.deleteSavedListing).toHaveBeenCalledTimes(1)

      await act(async () => resolvePanelDelete({ success: true }))
      await act(async () => Promise.resolve())
      expect(mocks.deleteSavedListing).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })
})
