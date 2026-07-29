import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

const mocks = vi.hoisted(() => ({ updateListerReview: vi.fn() }))
vi.mock("./updateListerReview", () => ({
  updateListerReview: mocks.updateListerReview,
}))

import { useUpdateListerReview } from "./useUpdateListerReview"

const review = {
  _id: "review-1",
  reviewerId: "user-1",
  listerProfileId: "profile-1",
  relatedListingId: null,
  relatedBuildingId: null,
  rating: 4,
  tags: ["RESPONSIVE" as const],
  comment: "Original",
  interaction: { isVerified: false, verifiedBy: null, contactEventId: null, verifiedAt: null },
  moderation: { hiddenBy: null, hiddenAt: null, hiddenReason: null, removedBy: null, removedAt: null, removedReason: null },
  visibility: { isCollapsed: false, collapsedBy: null, collapsedAt: null, collapseReason: null },
  editedAt: null,
  isDeleted: false,
  deletedAt: null,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
}
const oldSummary = {
  averageRating: 4,
  reviewCount: 1,
  ratingCounts: { oneStar: 0, twoStars: 0, threeStars: 0, fourStars: 1, fiveStars: 0 },
  tagCounts: [{ tag: "RESPONSIVE" as const, count: 1 }],
}
const updatedReview = { ...review, rating: 2, tags: ["RUDE" as const], comment: "Updated", editedAt: "2026-07-22T00:00:00.000Z", updatedAt: "2026-07-22T00:00:00.000Z" }
const newSummary = {
  averageRating: 2,
  reviewCount: 1,
  ratingCounts: { oneStar: 0, twoStars: 1, threeStars: 0, fourStars: 0, fiveStars: 0 },
  tagCounts: [{ tag: "RUDE" as const, count: 1 }],
}
const variables = {
  reviewId: "review-1",
  review,
  currentSummary: oldSummary,
  rating: 2,
  tags: ["RUDE" as const],
  comment: "Updated",
}

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  const reviewsKey = queryKeys.listerReviews.list({ listerProfileId: "profile-1", sort: "highest", limit: 10 })
  const profileKey = queryKeys.profiles.detail("profile-1")
  const reportKey = queryKeys.admin.reviewReports.detail("report-1")
  queryClient.setQueryData(reviewsKey, {
    pageParams: [1],
    pages: [{ success: true, data: { myReview: review, reviews: [review] }, pagination: { page: 1, limit: 10, total: 1 } }],
  })
  queryClient.setQueryData(profileKey, { _id: "profile-1", reviewSummary: oldSummary })
  queryClient.setQueryData(reportKey, { _id: "report-1", review, listerProfile: { _id: "profile-1", reviewSummary: oldSummary } })

  function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return { ...renderHook(() => useUpdateListerReview(), { wrapper: Wrapper }), queryClient, reviewsKey, profileKey, reportKey }
}

describe("useUpdateListerReview", () => {
  beforeEach(() => {
    mocks.updateListerReview.mockReset()
  })

  it("optimistically patches review copies and replaces their summary contribution", async () => {
    let resolve!: (value: { review: typeof updatedReview; reviewSummary: typeof newSummary }) => void
    mocks.updateListerReview.mockImplementation(() => new Promise((done) => { resolve = done }))
    const { result, queryClient, reviewsKey, profileKey, reportKey } = setup()

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(queryClient.getQueryData(reviewsKey)).toMatchObject({ pages: [{ data: { myReview: { rating: 2, tags: ["RUDE"] } } }] }))
    expect(queryClient.getQueryData(profileKey)).toMatchObject({ reviewSummary: newSummary })
    expect(queryClient.getQueryData(reportKey)).toMatchObject({ review: { rating: 2 }, listerProfile: { reviewSummary: newSummary } })

    await act(async () => resolve({ review: updatedReview, reviewSummary: newSummary }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("restores all exact snapshots on failure", async () => {
    mocks.updateListerReview.mockRejectedValue(new Error("Network error"))
    const { result, queryClient, reviewsKey, reportKey } = setup()

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(reviewsKey)).toMatchObject({ pages: [{ data: { myReview: { rating: 4 } } }] })
    expect(queryClient.getQueryData(reportKey)).toMatchObject({ review: { rating: 4 } })
  })

  it("reconciles server data and invalidates only the target review lists", async () => {
    mocks.updateListerReview.mockResolvedValue({ review: updatedReview, reviewSummary: newSummary })
    const { result, queryClient, reviewsKey, reportKey } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(reviewsKey)).toMatchObject({ pages: [{ data: { myReview: updatedReview } }] })
    expect(queryClient.getQueryData(reportKey)).toMatchObject({ review: updatedReview })
    expect(invalidate).toHaveBeenCalledTimes(2)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.listerReviews.byLister("profile-1"), refetchType: "active" })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.listerReviewTeasers.byLister("profile-1"), refetchType: "active" })
  })
})
