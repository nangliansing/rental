import type { PropsWithChildren } from "react"
import { renderHook } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  getPublicListingById: vi.fn(),
  getOwnerListingById: vi.fn(),
}))

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: mocks.useAuth,
}))

vi.mock("../api/getPublicListingById", () => ({
  getPublicListingById: mocks.getPublicListingById,
}))

vi.mock("../api/getOwnerListingById", () => ({
  getOwnerListingById: mocks.getOwnerListingById,
}))

import { useListingDetailData } from "./useListingDetailData"

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe("useListingDetailData", () => {
  it("reports loading while auth is still resolving", () => {
    mocks.useAuth.mockReturnValue({
      user: undefined,
      isLoading: true,
    })

    const { result } = renderHook(
      () => useListingDetailData({ listingId: "listing-1" }),
      { wrapper: createWrapper() },
    )

    expect(result.current.isLoading).toBe(true)
    expect(result.current.listing).toBeNull()
  })

  it("does not report loading after auth and fetch settle with no listing", async () => {
    mocks.useAuth.mockReturnValue({
      user: undefined,
      isLoading: false,
    })
    mocks.getPublicListingById.mockRejectedValue(new Error("Not found"))

    const { result } = renderHook(
      () => useListingDetailData({ listingId: "missing-listing" }),
      { wrapper: createWrapper() },
    )

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.listing).toBeNull()
  })
})
