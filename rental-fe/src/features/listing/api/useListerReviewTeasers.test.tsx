import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

const mocks = vi.hoisted(() => ({
  searchListerReviews: vi.fn(),
}))

vi.mock("@/features/lister-review/api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/lister-review/api")>()
  return {
    ...actual,
    searchListerReviews: mocks.searchListerReviews,
  }
})

import {
  LISTER_REVIEW_TEASER_LIMIT,
  LISTER_REVIEW_TEASER_SORT,
  useListerReviewTeasers,
} from "./useListerReviewTeasers"

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  return { Wrapper, queryClient }
}

describe("useListerReviewTeasers", () => {
  beforeEach(() => {
    mocks.searchListerReviews.mockReset()
  })

  it("fetches the first latest page with the teaser limit", async () => {
    mocks.searchListerReviews.mockResolvedValue({
      success: true,
      data: { myReview: null, reviews: [] },
      pagination: { page: 1, limit: LISTER_REVIEW_TEASER_LIMIT, total: 0 },
    })

    const { Wrapper, queryClient } = createWrapper()
    const { result } = renderHook(
      () => useListerReviewTeasers({ listerProfileId: "agent-1" }),
      { wrapper: Wrapper },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mocks.searchListerReviews).toHaveBeenCalledWith({
      listerProfileId: "agent-1",
      page: 1,
      limit: LISTER_REVIEW_TEASER_LIMIT,
      sort: LISTER_REVIEW_TEASER_SORT,
    })
    // Teasers live in their own namespace so review mutations cannot patch this
    // flat cache with the infinite list shape.
    expect(
      queryClient.getQueryData(
        queryKeys.listerReviewTeasers.list({
          listerProfileId: "agent-1",
          sort: LISTER_REVIEW_TEASER_SORT,
          limit: LISTER_REVIEW_TEASER_LIMIT,
        }),
      ),
    ).toBeTruthy()
    expect(
      queryClient.getQueryData(
        queryKeys.listerReviews.list({
          listerProfileId: "agent-1",
          sort: LISTER_REVIEW_TEASER_SORT,
          limit: LISTER_REVIEW_TEASER_LIMIT,
        }),
      ),
    ).toBeUndefined()
  })

  it("stays idle when disabled or missing profile id", () => {
    const { Wrapper } = createWrapper()

    const disabled = renderHook(
      () =>
        useListerReviewTeasers({
          listerProfileId: "agent-1",
          enabled: false,
        }),
      { wrapper: Wrapper },
    )
    expect(disabled.result.current.fetchStatus).toBe("idle")
    expect(mocks.searchListerReviews).not.toHaveBeenCalled()

    const missing = renderHook(() => useListerReviewTeasers({}), {
      wrapper: Wrapper,
    })
    expect(missing.result.current.fetchStatus).toBe("idle")
    expect(mocks.searchListerReviews).not.toHaveBeenCalled()
  })
})
