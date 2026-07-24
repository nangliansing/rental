import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

const searchMocks = vi.hoisted(() => ({
  agent: vi.fn(),
  building: vi.fn(),
  owner: vi.fn(),
  pending: vi.fn(),
  saved: vi.fn(),
}))

vi.mock("@/features/agent/api/searchListingsByAgent", () => ({
  searchListingsByAgent: searchMocks.agent,
}))
vi.mock("@/features/map-search/api/searchListingsInBuilding", () => ({
  searchListingsInBuilding: searchMocks.building,
}))
vi.mock("@/features/listing/api/searchOwnerListings", () => ({
  searchOwnerListings: searchMocks.owner,
}))
vi.mock("@/features/pending-post/api/searchOwnerPendingPosts", () => ({
  searchOwnerPendingPosts: searchMocks.pending,
}))
vi.mock("@/features/saved-listing/api/searchSavedListings", () => ({
  searchSavedListings: searchMocks.saved,
}))

import { useSearchListingsByAgent } from "@/features/agent/api/useSearchListingsByAgent"
import { useSearchOwnerListings } from "@/features/listing/api/useSearchOwnerListings"
import { useSearchListingsInBuilding } from "@/features/map-search/api/useSearchListingsInBuilding"
import { useSearchOwnerPendingPosts } from "@/features/pending-post/api/useSearchOwnerPendingPosts"
import { useSearchSavedListings } from "@/features/saved-listing/api/useSearchSavedListings"

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

function installPendingRequest(mock: ReturnType<typeof vi.fn>) {
  let capturedSignal: AbortSignal | undefined
  mock.mockImplementation((input: { signal?: AbortSignal }) => {
    capturedSignal = input.signal
    return new Promise(() => undefined)
  })
  return () => capturedSignal
}

describe("listing infinite-query cancellation", () => {
  it.each([
    ["owner", () => useSearchOwnerListings()],
    ["saved", () => useSearchSavedListings()],
    ["pending", () => useSearchOwnerPendingPosts()],
    ["building", () => useSearchListingsInBuilding({ buildingId: "building-1", filters: {} })],
    ["agent", () => useSearchListingsByAgent({ agentProfileId: "agent-1" })],
  ] as const)("aborts the %s request when its observer unmounts", async (key, useQueryHook) => {
    const getSignal = installPendingRequest(searchMocks[key])
    const { unmount } = renderHook(() => {
      useQueryHook()
    }, { wrapper: createWrapper() })

    await waitFor(() => expect(getSignal()).toBeInstanceOf(AbortSignal))
    expect(getSignal()?.aborted).toBe(false)

    unmount()

    expect(getSignal()?.aborted).toBe(true)
  })

  it("aborts the stale owner request when sort parameters change", async () => {
    const signals: AbortSignal[] = []
    searchMocks.owner.mockImplementation((input: { signal?: AbortSignal }) => {
      if (input.signal) signals.push(input.signal)
      return new Promise(() => undefined)
    })

    const { rerender, unmount } = renderHook(
      ({ sort }: { sort: "latest" | "oldest" }) =>
        useSearchOwnerListings({ sort }),
      {
        initialProps: { sort: "latest" } as { sort: "latest" | "oldest" },
        wrapper: createWrapper(),
      },
    )

    await waitFor(() => expect(signals).toHaveLength(1))
    rerender({ sort: "oldest" })
    await waitFor(() => expect(signals).toHaveLength(2))

    expect(signals[0].aborted).toBe(true)
    expect(signals[1].aborted).toBe(false)

    unmount()
    expect(signals[1].aborted).toBe(true)
  })
})
