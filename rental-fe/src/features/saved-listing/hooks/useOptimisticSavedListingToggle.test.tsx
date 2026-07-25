import type { PropsWithChildren } from "react"
import { act, renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createSavedListing: vi.fn(),
  deleteSavedListing: vi.fn(),
  patchListingSavedStateInCache: vi.fn(),
  syncListingSavedState: vi.fn(),
}))

vi.mock("../api", () => ({
  createSavedListing: mocks.createSavedListing,
  deleteSavedListing: mocks.deleteSavedListing,
  isSavedListingAlreadyExistsError: () => false,
  isSavedListingNotFoundError: () => false,
}))

vi.mock("../utils/savedListingCache", () => ({
  patchListingSavedStateInCache: mocks.patchListingSavedStateInCache,
  syncListingSavedState: mocks.syncListingSavedState,
}))

import { useOptimisticSavedListingToggle } from "./useOptimisticSavedListingToggle"

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })

  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

async function runDebounce() {
  await act(async () => {
    vi.advanceTimersByTime(400)
    await Promise.resolve()
  })
}

describe("useOptimisticSavedListingToggle", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.createSavedListing.mockResolvedValue({})
    mocks.deleteSavedListing.mockResolvedValue({})
    mocks.syncListingSavedState.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it("updates immediately and sends only the last state after the debounce", async () => {
    const { result } = renderHook(
      () =>
        useOptimisticSavedListingToggle({
          listingId: "listing-1",
          initialIsSaved: false,
        }),
      { wrapper: createWrapper() },
    )

    act(() => {
      result.current.toggle()
      result.current.toggle()
      result.current.toggle()
    })

    expect(result.current.isSaved).toBe(true)
    expect(mocks.createSavedListing).not.toHaveBeenCalled()

    await runDebounce()

    expect(mocks.createSavedListing).toHaveBeenCalledOnce()
    expect(mocks.deleteSavedListing).not.toHaveBeenCalled()
  })

  it("aborts an active request as soon as a newer intent arrives", async () => {
    let firstSignal: AbortSignal | undefined
    mocks.createSavedListing.mockImplementation(
      ({ signal }: { signal?: AbortSignal }) => {
        firstSignal = signal
        return new Promise((_resolve, reject) => {
          signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          )
        })
      },
    )

    const { result } = renderHook(
      () =>
        useOptimisticSavedListingToggle({
          listingId: "listing-1",
          initialIsSaved: false,
        }),
      { wrapper: createWrapper() },
    )

    act(() => result.current.toggle())
    await runDebounce()
    expect(firstSignal?.aborted).toBe(false)

    act(() => result.current.toggle())
    expect(firstSignal?.aborted).toBe(true)
    expect(result.current.isSaved).toBe(false)

    await runDebounce()
    expect(mocks.deleteSavedListing).toHaveBeenCalledOnce()
  })

  it("rolls back to the confirmed state after a genuine failure", async () => {
    mocks.createSavedListing.mockRejectedValue(new Error("Network error"))

    const { result } = renderHook(
      () =>
        useOptimisticSavedListingToggle({
          listingId: "listing-1",
          initialIsSaved: false,
        }),
      { wrapper: createWrapper() },
    )

    act(() => result.current.toggle())
    expect(result.current.isSaved).toBe(true)

    await runDebounce()
    await act(async () => Promise.resolve())

    expect(result.current.isSaved).toBe(false)
    expect(mocks.patchListingSavedStateInCache).toHaveBeenLastCalledWith(
      expect.objectContaining({ listingId: "listing-1", isSaved: false }),
    )
  })

  it("syncs local state when initialIsSaved changes after server refresh", () => {
    const { result, rerender } = renderHook(
      ({ initialIsSaved }: { initialIsSaved: boolean }) =>
        useOptimisticSavedListingToggle({
          listingId: "listing-1",
          initialIsSaved,
        }),
      {
        wrapper: createWrapper(),
        initialProps: { initialIsSaved: false },
      },
    )

    expect(result.current.isSaved).toBe(false)

    rerender({ initialIsSaved: true })

    expect(result.current.isSaved).toBe(true)
  })
})
