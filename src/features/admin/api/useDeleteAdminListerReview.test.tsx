import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type {
  ListerReview,
  ListerReviewSummary,
} from "@/features/lister-review/api"
import {
  reviewProjectionQueryKeys,
} from "@/features/lister-review/api/reviewMutationCache"
import type { SearchListerReviewsResponse } from "@/features/lister-review/api/searchListerReviews"
import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
import type { InfiniteData } from "@tanstack/react-query"

const mocks = vi.hoisted(() => ({ deleteAdminListerReview: vi.fn() }))

vi.mock("./deleteAdminListerReview", () => ({
  deleteAdminListerReview: mocks.deleteAdminListerReview,
  isAdminListerReviewNotFoundError: (error: unknown) =>
    (error as { code?: string }).code === "LISTER_REVIEW_NOT_FOUND",
}))

import { useDeleteAdminListerReview } from "./useDeleteAdminListerReview"

const review = {
  _id: "review-1",
  listerProfileId: "profile-1",
  isDeleted: false,
  deletedAt: null,
  moderation: { removedReason: null },
} as ListerReview

const summary: ListerReviewSummary = {
  averageRating: 4,
  reviewCount: 1,
  ratingCounts: {
    oneStar: 0,
    twoStars: 0,
    threeStars: 0,
    fourStars: 1,
    fiveStars: 0,
  },
  tagCounts: [],
}

const reviewData: InfiniteData<SearchListerReviewsResponse> = {
  pageParams: [1],
  pages: [
    {
      success: true,
      data: { myReview: review, reviews: [review] },
      pagination: { page: 1, limit: 20, total: 1 },
    },
  ],
}

const variables = {
  reviewId: "review-1",
  reviewReportId: "report-1",
  listerProfileId: "profile-1",
  listerUserId: "lister-user",
  reason: "Policy violation",
}

type CachedReviewReport = {
  review: { isDeleted: boolean }
}

function setup(currentUserId = "admin-user") {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const reviewListKey = queryKeys.listerReviews.list({
    listerProfileId: "profile-1",
    sort: "latest",
    limit: 20,
  })
  const reportListKey = queryKeys.admin.reviewReports.list("OPEN")
  const reportDetailKey = queryKeys.admin.reviewReports.detail("report-1")
  const report = {
    _id: "report-1",
    status: "OPEN",
    review,
    listerProfile: { _id: "profile-1", reviewSummary: summary },
  }
  queryClient.setQueryData(reviewListKey, reviewData)
  queryClient.setQueryData(reportListKey, {
    pageParams: [1],
    pages: [
      {
        success: true,
        data: [report],
        pagination: { page: 1, limit: 20, total: 1 },
      },
    ],
  })
  queryClient.setQueryData(reportDetailKey, report)

  const projectionKeys = reviewProjectionQueryKeys(
    "profile-1",
    currentUserId === "lister-user",
  )
  projectionKeys.slice(1).forEach((key) => {
    queryClient.setQueryData(key, {
      agentProfile: { _id: "profile-1", reviewSummary: summary },
    })
  })

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  return {
    ...renderHook(() => useDeleteAdminListerReview(currentUserId), {
      wrapper: Wrapper,
    }),
    projectionKeys,
    queryClient,
    reportDetailKey,
    reportListKey,
    reviewListKey,
  }
}

describe("useDeleteAdminListerReview", () => {
  beforeEach(() => {
    mocks.deleteAdminListerReview.mockReset()
  })

  it("optimistically removes review pages and marks admin copies deleted", async () => {
    let resolve!: (value: unknown) => void
    mocks.deleteAdminListerReview.mockReturnValue(
      new Promise((done) => {
        resolve = done
      }),
    )
    const { result, queryClient, reviewListKey, reportDetailKey } = setup()

    act(() => result.current.mutate(variables))

    await waitFor(() =>
      expect(
        queryClient.getQueryData<InfiniteData<SearchListerReviewsResponse>>(
          reviewListKey,
        )?.pages[0].data.reviews,
      ).toEqual([]),
    )
    expect(
      queryClient.getQueryData<CachedReviewReport>(reportDetailKey)?.review,
    ).toMatchObject({ isDeleted: true })

    await act(async () => resolve(null))
  })

  it("restores every optimistic cache on genuine failure", async () => {
    mocks.deleteAdminListerReview.mockRejectedValue(new Error("Network error"))
    const { result, queryClient, reviewListKey, reportDetailKey } = setup()

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(
      queryClient.getQueryData<InfiniteData<SearchListerReviewsResponse>>(
        reviewListKey,
      )?.pages[0].data.reviews,
    ).toHaveLength(1)
    expect(
      queryClient.getQueryData<CachedReviewReport>(reportDetailKey)?.review,
    ).toMatchObject({ isDeleted: false })
  })

  it("propagates the authoritative summary and invalidates related keys", async () => {
    const updatedSummary = { ...summary, averageRating: 0, reviewCount: 0 }
    mocks.deleteAdminListerReview.mockResolvedValue({
      review: {
        ...review,
        isDeleted: true,
        deletedAt: "2026-07-22T00:00:00.000Z",
      },
      reviewSummary: updatedSummary,
    })
    const { result, queryClient, projectionKeys, reportDetailKey } =
      setup("lister-user")
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(queryClient.getQueryData(reportDetailKey)).toMatchObject({
      listerProfile: { reviewSummary: updatedSummary },
      review: { isDeleted: true, deletedAt: "2026-07-22T00:00:00.000Z" },
    })
    projectionKeys.forEach((queryKey) => {
      expect(invalidate).toHaveBeenCalledWith({
        queryKey,
        refetchType: "active",
      })
    })
    expect(projectionKeys).toContainEqual(queryKeys.profiles.me)
  })

  it("keeps the optimistic removal when the review is already absent", async () => {
    mocks.deleteAdminListerReview.mockRejectedValue(
      new ApiError("Missing", 404, "LISTER_REVIEW_NOT_FOUND"),
    )
    const { result, queryClient, reviewListKey } = setup()

    act(() => result.current.mutate(variables))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(
      queryClient.getQueryData<InfiniteData<SearchListerReviewsResponse>>(
        reviewListKey,
      )?.pages[0].data.reviews,
    ).toEqual([])
  })

  it("serializes repeated deletions", async () => {
    let resolveFirst!: (value: null) => void
    mocks.deleteAdminListerReview.mockImplementation(
      ({ reviewId }: { reviewId: string }) =>
        reviewId === "review-1"
          ? new Promise<null>((resolve) => {
              resolveFirst = resolve
            })
          : Promise.resolve(null),
    )
    const { result } = setup()

    act(() => {
      result.current.mutate(variables)
      result.current.mutate({ ...variables, reviewId: "review-2" })
    })
    await waitFor(() =>
      expect(mocks.deleteAdminListerReview).toHaveBeenCalledTimes(1),
    )
    await act(async () => resolveFirst(null))
    await waitFor(() =>
      expect(mocks.deleteAdminListerReview).toHaveBeenCalledTimes(2),
    )
  })
})
