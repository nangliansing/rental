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
  reviewer: {
    userId: "user-1",
    name: "Jane Doe",
    displayName: "Jane",
    profilePhoto: null,
    isVerified: true,
  },
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
  const teaserKey = queryKeys.listerReviewTeasers.list({ listerProfileId: "profile-1", sort: "latest", limit: 3 })
  const profileKey = queryKeys.profiles.detail("profile-1")
  const reportKey = queryKeys.admin.reviewReports.detail("report-1")
  queryClient.setQueryData(reviewsKey, {
    pageParams: [1],
    pages: [{ success: true, data: { myReview: review, reviews: [review] }, pagination: { page: 1, limit: 10, total: 1 } }],
  })
  // Flat teaser cache (useQuery), not InfiniteData: delete must leave it alone
  // and refetch it instead of patching it with the infinite shape.
  queryClient.setQueryData(teaserKey, {
    success: true,
    data: { myReview: review, reviews: [] },
    pagination: { page: 1, limit: 3, total: 0 },
  })
  queryClient.setQueryData(profileKey, { _id: "profile-1", reviewSummary: summary })
  queryClient.setQueryData(reportKey, { _id: "report-1", review, listerProfile: { _id: "profile-1", reviewSummary: summary } })

  function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return { ...renderHook(() => useDeleteListerReview(), { wrapper: Wrapper }), queryClient, reviewsKey, teaserKey, profileKey, reportKey }
}

describe("useDeleteListerReview", () => {
  beforeEach(() => {
    mocks.deleteListerReview.mockReset()
  })

  it("optimistically removes the review, fixes pagination, and patches projections", async () => {
    let resolve!: (value: { review: typeof deletedReview; reviewSummary: typeof emptySummary }) => void
    mocks.deleteListerReview.mockImplementation(() => new Promise((done) => { resolve = done }))
    const { result, queryClient, reviewsKey, teaserKey, profileKey, reportKey } = setup()

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(queryClient.getQueryData(reviewsKey)).toMatchObject({ pages: [{ data: { myReview: null, reviews: [] }, pagination: { total: 0 } }] }))
    // Teasers are refetched on settle, never patched with the infinite shape.
    expect(queryClient.getQueryData(teaserKey)).toMatchObject({
      data: { myReview: { _id: "review-1" } },
    })
    expect(queryClient.getQueryData(profileKey)).toMatchObject({ reviewSummary: emptySummary })
    expect(queryClient.getQueryData(reportKey)).toMatchObject({ review: { isDeleted: true }, listerProfile: { reviewSummary: emptySummary } })

    await act(async () => resolve({ review: deletedReview, reviewSummary: emptySummary }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("restores every exact snapshot on failure", async () => {
    mocks.deleteListerReview.mockRejectedValue(new Error("Network error"))
    const { result, queryClient, reviewsKey, teaserKey, profileKey, reportKey } = setup()

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(reviewsKey)).toMatchObject({ pages: [{ data: { myReview: { _id: "review-1" }, reviews: [{ _id: "review-1" }] }, pagination: { total: 1 } }] })
    expect(queryClient.getQueryData(teaserKey)).toMatchObject({
      data: { myReview: { _id: "review-1" }, reviews: [] },
    })
    expect(queryClient.getQueryData(profileKey)).toMatchObject({ reviewSummary: summary })
    expect(queryClient.getQueryData(reportKey)).toMatchObject({ review: { isDeleted: false } })
  })

  it("does not invalidate or modify unrelated caches when deletion fails", async () => {
    mocks.deleteListerReview.mockRejectedValue(new Error("Network error"))
    const { result, queryClient } = setup()
    const unrelatedKey = queryKeys.notifications.me
    const unrelatedData = { unreadCount: 3 }
    queryClient.setQueryData(unrelatedKey, unrelatedData)
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(invalidate).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(unrelatedKey)).toBe(unrelatedData)
  })

  it("waits for the server summary when no current summary is available", async () => {
    let resolve!: (value: {
      review: typeof deletedReview
      reviewSummary: typeof emptySummary
    }) => void
    mocks.deleteListerReview.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const { result, queryClient, profileKey, reportKey } = setup()

    act(() => result.current.mutate({ review }))
    await waitFor(() =>
      expect(queryClient.getQueryData(reportKey)).toMatchObject({
        review: { isDeleted: true },
      }),
    )
    expect(queryClient.getQueryData(profileKey)).toMatchObject({
      reviewSummary: summary,
    })

    await act(async () =>
      resolve({
        review: deletedReview,
        reviewSummary: emptySummary,
      }),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(profileKey)).toMatchObject({
      reviewSummary: emptySummary,
    })
    expect(queryClient.getQueryData(reportKey)).toMatchObject({
      review: deletedReview,
      listerProfile: { reviewSummary: emptySummary },
    })
  })

  it("succeeds safely when every related cache has been evicted", async () => {
    mocks.deleteListerReview.mockResolvedValue({
      review: deletedReview,
      reviewSummary: emptySummary,
    })
    const {
      result,
      queryClient,
      reviewsKey,
      teaserKey,
      profileKey,
      reportKey,
    } = setup()
    queryClient.clear()

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    for (const queryKey of [
      reviewsKey,
      teaserKey,
      profileKey,
      reportKey,
    ]) {
      expect(
        queryClient.getQueryCache().find({ queryKey, exact: true }),
      ).toBeUndefined()
    }
  })

  it("reconciles server state and invalidates only review-backed collections", async () => {
    mocks.deleteListerReview.mockResolvedValue({
      review: { ...deletedReview, reviewer: undefined },
      reviewSummary: emptySummary,
    })
    const { result, queryClient, reportKey } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(reportKey)).toMatchObject({
      review: {
        isDeleted: true,
        reviewer: review.reviewer,
      },
    })
    expect(invalidate).toHaveBeenCalledTimes(4)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.listerReviews.byLister("profile-1"), refetchType: "active" })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.listerReviewTeasers.byLister("profile-1"), refetchType: "active" })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.admin.reviewReports.lists, refetchType: "active" })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.admin.reviewReports.details, refetchType: "active" })
  })

  it("does not call the delete endpoint or mutate caches when cancellation fails", async () => {
    const { result, queryClient, reviewsKey, profileKey } = setup()
    vi.spyOn(queryClient, "cancelQueries").mockRejectedValueOnce(
      new Error("Cancellation failed"),
    )

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mocks.deleteListerReview).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(reviewsKey)).toMatchObject({
      pages: [{
        data: {
          myReview: { _id: "review-1" },
          reviews: [{ _id: "review-1" }],
        },
        pagination: { total: 1 },
      }],
    })
    expect(queryClient.getQueryData(profileKey)).toMatchObject({
      reviewSummary: summary,
    })
  })

  it("serializes repeated deletes to protect shared review summaries", async () => {
    let resolveFirst!: (value: {
      review: typeof deletedReview
      reviewSummary: typeof emptySummary
    }) => void
    mocks.deleteListerReview
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockResolvedValueOnce({
        review: deletedReview,
        reviewSummary: emptySummary,
      })
    const { result } = setup()

    act(() => {
      result.current.mutate(variables)
      result.current.mutate(variables)
    })
    await waitFor(() =>
      expect(mocks.deleteListerReview).toHaveBeenCalledTimes(1),
    )

    await act(async () =>
      resolveFirst({
        review: deletedReview,
        reviewSummary: emptySummary,
      }),
    )
    await waitFor(() =>
      expect(mocks.deleteListerReview).toHaveBeenCalledTimes(2),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})
