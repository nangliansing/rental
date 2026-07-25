import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

const mocks = vi.hoisted(() => ({ deleteListerReview: vi.fn() }))
vi.mock("./deleteListerReview", () => ({
  deleteListerReview: mocks.deleteListerReview,
}))

import { useDeleteListerReview } from "./useDeleteListerReview"

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
const summary = {
  averageRating: 4,
  reviewCount: 1,
  ratingCounts: { oneStar: 0, twoStars: 0, threeStars: 0, fourStars: 1, fiveStars: 0 },
  tagCounts: [{ tag: "RESPONSIVE" as const, count: 1 }],
}
const emptySummary = {
  averageRating: 0,
  reviewCount: 0,
  ratingCounts: { oneStar: 0, twoStars: 0, threeStars: 0, fourStars: 0, fiveStars: 0 },
  tagCounts: [],
}
const deletedReview = { ...review, isDeleted: true, deletedAt: "2026-07-22T00:00:00.000Z", updatedAt: "2026-07-22T00:00:00.000Z" }
const variables = { review, currentSummary: summary }

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  const reviewsKey = queryKeys.listerReviews.list({ listerProfileId: "profile-1", sort: "latest", limit: 10 })
  const profileKey = queryKeys.profiles.detail("profile-1")
  const reportKey = queryKeys.admin.reviewReports.detail("report-1")
  queryClient.setQueryData(reviewsKey, {
    pageParams: [1],
    pages: [{ success: true, data: { myReview: review, reviews: [review] }, pagination: { page: 1, limit: 10, total: 1 } }],
  })
  queryClient.setQueryData(profileKey, { _id: "profile-1", reviewSummary: summary })
  queryClient.setQueryData(reportKey, { _id: "report-1", review, listerProfile: { _id: "profile-1", reviewSummary: summary } })

  function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return { ...renderHook(() => useDeleteListerReview(), { wrapper: Wrapper }), queryClient, reviewsKey, profileKey, reportKey }
}

describe("useDeleteListerReview", () => {
  beforeEach(() => {
    mocks.deleteListerReview.mockReset()
  })

  it("optimistically removes the review, fixes pagination, and patches projections", async () => {
    let resolve!: (value: { review: typeof deletedReview; reviewSummary: typeof emptySummary }) => void
    mocks.deleteListerReview.mockImplementation(() => new Promise((done) => { resolve = done }))
    const { result, queryClient, reviewsKey, profileKey, reportKey } = setup()

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(queryClient.getQueryData(reviewsKey)).toMatchObject({ pages: [{ data: { myReview: null, reviews: [] }, pagination: { total: 0 } }] }))
    expect(queryClient.getQueryData(profileKey)).toMatchObject({ reviewSummary: emptySummary })
    expect(queryClient.getQueryData(reportKey)).toMatchObject({ review: { isDeleted: true }, listerProfile: { reviewSummary: emptySummary } })

    await act(async () => resolve({ review: deletedReview, reviewSummary: emptySummary }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("restores every exact snapshot on failure", async () => {
    mocks.deleteListerReview.mockRejectedValue(new Error("Network error"))
    const { result, queryClient, reviewsKey, profileKey, reportKey } = setup()

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(reviewsKey)).toMatchObject({ pages: [{ data: { myReview: { _id: "review-1" }, reviews: [{ _id: "review-1" }] }, pagination: { total: 1 } }] })
    expect(queryClient.getQueryData(profileKey)).toMatchObject({ reviewSummary: summary })
    expect(queryClient.getQueryData(reportKey)).toMatchObject({ review: { isDeleted: false } })
  })

  it("reconciles server state and invalidates only review-backed collections", async () => {
    mocks.deleteListerReview.mockResolvedValue({ review: deletedReview, reviewSummary: emptySummary })
    const { result, queryClient, reportKey } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(reportKey)).toMatchObject({ review: deletedReview })
    expect(invalidate).toHaveBeenCalledTimes(3)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.listerReviews.byLister("profile-1"), refetchType: "active" })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.admin.reviewReports.lists, refetchType: "active" })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.admin.reviewReports.details, refetchType: "active" })
  })
})
