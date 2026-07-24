import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

const mocks = vi.hoisted(() => ({ toggleListerReviewCollapse: vi.fn() }))
vi.mock("./toggleListerReviewCollapse", () => ({
  toggleListerReviewCollapse: mocks.toggleListerReviewCollapse,
}))

import { useToggleListerReviewCollapse } from "./useToggleListerReviewCollapse"

const review = {
  _id: "review-1",
  reviewerId: "user-1",
  listerProfileId: "profile-1",
  relatedListingId: null,
  relatedBuildingId: null,
  rating: 4,
  tags: [],
  comment: "Review",
  interaction: { isVerified: false, verifiedBy: null, contactEventId: null, verifiedAt: null },
  moderation: { hiddenBy: null, hiddenAt: null, hiddenReason: null, removedBy: null, removedAt: null, removedReason: null },
  visibility: { isCollapsed: false, collapsedBy: null, collapsedAt: null, collapseReason: null },
  editedAt: null,
  isDeleted: false,
  deletedAt: null,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
}
const serverReview = {
  ...review,
  visibility: {
    isCollapsed: true,
    collapsedBy: "owner-1",
    collapsedAt: "2026-07-22T00:00:00.000Z",
    collapseReason: null,
  },
  updatedAt: "2026-07-22T00:00:00.000Z",
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const reviewsKey = queryKeys.listerReviews.list({ listerProfileId: "profile-1", sort: "latest", limit: 10 })
  const reportKey = queryKeys.admin.reviewReports.detail("report-1")
  queryClient.setQueryData(reviewsKey, {
    pageParams: [1],
    pages: [{ success: true, data: { myReview: null, reviews: [review] }, pagination: { page: 1, limit: 10, total: 1 } }],
  })
  queryClient.setQueryData(reportKey, { _id: "report-1", review })

  function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return { ...renderHook(() => useToggleListerReviewCollapse(), { wrapper: Wrapper }), queryClient, reviewsKey, reportKey }
}

describe("useToggleListerReviewCollapse", () => {
  beforeEach(() => {
    mocks.toggleListerReviewCollapse.mockReset()
  })

  it("optimistically toggles every cached review copy", async () => {
    let resolve!: (value: typeof serverReview) => void
    mocks.toggleListerReviewCollapse.mockImplementation(() => new Promise((done) => { resolve = done }))
    const { result, queryClient, reviewsKey, reportKey } = setup()

    act(() => result.current.mutate({ review }))
    await waitFor(() => expect(queryClient.getQueryData(reviewsKey)).toMatchObject({ pages: [{ data: { reviews: [{ visibility: { isCollapsed: true } }] } }] }))
    expect(queryClient.getQueryData(reportKey)).toMatchObject({ review: { visibility: { isCollapsed: true } } })

    await act(async () => resolve(serverReview))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("restores exact snapshots on error", async () => {
    mocks.toggleListerReviewCollapse.mockRejectedValue(new Error("Network error"))
    const { result, queryClient, reviewsKey, reportKey } = setup()

    act(() => result.current.mutate({ review }))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(reviewsKey)).toMatchObject({ pages: [{ data: { reviews: [{ visibility: { isCollapsed: false } }] } }] })
    expect(queryClient.getQueryData(reportKey)).toMatchObject({ review: { visibility: { isCollapsed: false } } })
  })

  it("reconciles authoritative data without invalidating queries", async () => {
    mocks.toggleListerReviewCollapse.mockResolvedValue(serverReview)
    const { result, queryClient, reviewsKey, reportKey } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate({ review }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(reviewsKey)).toMatchObject({ pages: [{ data: { reviews: [serverReview] } }] })
    expect(queryClient.getQueryData(reportKey)).toMatchObject({ review: serverReview })
    expect(invalidate).not.toHaveBeenCalled()
  })
})
