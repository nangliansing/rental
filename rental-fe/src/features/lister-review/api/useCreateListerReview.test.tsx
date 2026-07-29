import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

const mocks = vi.hoisted(() => ({ createListerReview: vi.fn() }))

vi.mock("./createListerReview", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./createListerReview")>()
  return { ...actual, createListerReview: mocks.createListerReview }
})

import { useCreateListerReview } from "./useCreateListerReview"

const oldSummary = {
  averageRating: 4,
  reviewCount: 1,
  ratingCounts: {
    oneStar: 0,
    twoStars: 0,
    threeStars: 0,
    fourStars: 1,
    fiveStars: 0,
  },
  tagCounts: [{ tag: "RESPONSIVE" as const, count: 1 }],
}
const newSummary = {
  averageRating: 4.5,
  reviewCount: 2,
  ratingCounts: { ...oldSummary.ratingCounts, fiveStars: 1 },
  tagCounts: [
    { tag: "RESPONSIVE" as const, count: 1 },
    { tag: "HELPFUL" as const, count: 1 },
  ],
}
const serverReview = {
  _id: "review-1",
  reviewerId: "user-1",
  listerProfileId: "profile-1",
  relatedListingId: null,
  relatedBuildingId: null,
  rating: 5,
  tags: ["HELPFUL" as const],
  comment: "Great",
  interaction: { isVerified: true, verifiedBy: "CONTACT_CLICK" as const, contactEventId: "event-1", verifiedAt: "now" },
  moderation: { hiddenBy: null, hiddenAt: null, hiddenReason: null, removedBy: null, removedAt: null, removedReason: null },
  visibility: { isCollapsed: false, collapsedBy: null, collapsedAt: null, collapseReason: null },
  editedAt: null,
  isDeleted: false,
  deletedAt: null,
  createdAt: "2026-07-22T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
}
const variables = {
  listerProfileId: "profile-1",
  reviewerId: "user-1",
  currentSummary: oldSummary,
  rating: 5,
  tags: ["HELPFUL" as const],
  comment: "Great",
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const reviewsKey = queryKeys.listerReviews.list({ listerProfileId: "profile-1", sort: "latest", limit: 10 })
  const otherReviewsKey = queryKeys.listerReviews.list({ listerProfileId: "profile-2", sort: "latest", limit: 10 })
  const profileKey = queryKeys.profiles.detail("profile-1")
  const listingKey = queryKeys.listings.publicDetail("listing-1", "user-1")
  const reviewPage = {
    pageParams: [1],
    pages: [{
      success: true,
      data: { myReview: null, reviews: [] },
      pagination: { page: 1, limit: 10, total: 0 },
    }],
  }
  queryClient.setQueryData(reviewsKey, reviewPage)
  queryClient.setQueryData(otherReviewsKey, reviewPage)
  queryClient.setQueryData(profileKey, { _id: "profile-1", reviewSummary: oldSummary })
  queryClient.setQueryData(listingKey, {
    _id: "listing-1",
    agentProfile: { _id: "profile-1", reviewSummary: oldSummary },
  })

  function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return { ...renderHook(() => useCreateListerReview(), { wrapper: Wrapper }), queryClient, reviewsKey, otherReviewsKey, profileKey, listingKey }
}

describe("useCreateListerReview", () => {
  beforeEach(() => {
    mocks.createListerReview.mockReset()
  })

  it("optimistically sets my review and patches related summaries", async () => {
    let resolve!: (value: { review: typeof serverReview; reviewSummary: typeof newSummary }) => void
    mocks.createListerReview.mockImplementation(() => new Promise((done) => { resolve = done }))
    const { result, queryClient, reviewsKey, otherReviewsKey, profileKey, listingKey } = setup()

    act(() => result.current.mutate(variables))
    await waitFor(() =>
      expect(queryClient.getQueryData(reviewsKey)).toMatchObject({
        pages: [{ data: { myReview: { reviewerId: "user-1", rating: 5 } } }],
      }),
    )
    expect(queryClient.getQueryData(otherReviewsKey)).toMatchObject({
      pages: [{ data: { myReview: null } }],
    })
    expect(queryClient.getQueryData(profileKey)).toMatchObject({
      reviewSummary: { averageRating: 4.5, reviewCount: 2 },
    })
    expect(queryClient.getQueryData(listingKey)).toMatchObject({
      agentProfile: { reviewSummary: { reviewCount: 2 } },
    })

    await act(async () => resolve({ review: serverReview, reviewSummary: newSummary }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("restores every exact cache snapshot on failure", async () => {
    mocks.createListerReview.mockRejectedValue(new Error("Network error"))
    const { result, queryClient, reviewsKey, profileKey } = setup()

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(queryClient.getQueryData(reviewsKey)).toMatchObject({
      pages: [{ data: { myReview: null } }],
    })
    expect(queryClient.getQueryData(profileKey)).toMatchObject({ reviewSummary: oldSummary })
  })

  it("reconciles the server response and invalidates only target review lists", async () => {
    mocks.createListerReview.mockResolvedValue({ review: serverReview, reviewSummary: newSummary })
    const { result, queryClient, reviewsKey, profileKey } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(queryClient.getQueryData(reviewsKey)).toMatchObject({
      pages: [{ data: { myReview: { _id: "review-1", interaction: { isVerified: true } } } }],
    })
    expect(queryClient.getQueryData(profileKey)).toMatchObject({ reviewSummary: newSummary })
    expect(invalidate).toHaveBeenCalledTimes(2)
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.listerReviews.byLister("profile-1"),
      refetchType: "active",
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.listerReviewTeasers.byLister("profile-1"),
      refetchType: "active",
    })
  })
})
