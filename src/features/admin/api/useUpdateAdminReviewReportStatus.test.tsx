import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"
import type { StatusInfiniteData } from "@/lib/status-transition-cache"

import type {
  AdminReviewReport,
  SearchAdminReviewReportsResponse,
} from "./searchAdminReviewReports"

const mocks = vi.hoisted(() => ({
  updateAdminReviewReportStatus: vi.fn(),
}))

vi.mock("./updateAdminReviewReportStatus", () => ({
  updateAdminReviewReportStatus: mocks.updateAdminReviewReportStatus,
}))

import { useUpdateAdminReviewReportStatus } from "./useUpdateAdminReviewReportStatus"

type ReviewReportData = StatusInfiniteData<
  AdminReviewReport,
  SearchAdminReviewReportsResponse
>

const report = (
  id: string,
  status: AdminReviewReport["status"] = "OPEN",
  reviewNote: string | null = null,
) => ({ _id: id, status, reviewNote }) as AdminReviewReport

const data = (...reports: AdminReviewReport[]): ReviewReportData => ({
  pageParams: [1],
  pages: [
    {
      success: true,
      data: reports,
      pagination: { page: 1, limit: 20, total: reports.length },
    },
  ],
})

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const allKey = queryKeys.admin.reviewReports.list(undefined)
  const openKey = queryKeys.admin.reviewReports.list("OPEN")
  const dismissedKey = queryKeys.admin.reviewReports.list("DISMISSED")
  const detailKey = queryKeys.admin.reviewReports.detail("report-1")
  const source = report("report-1")
  queryClient.setQueryData(allKey, data(source, report("report-2")))
  queryClient.setQueryData(openKey, data(source, report("report-2")))
  queryClient.setQueryData(dismissedKey, data(report("old", "DISMISSED")))
  queryClient.setQueryData(detailKey, source)
  queryClient.setQueryData(queryKeys.listerReviews.lists, { untouched: true })

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  return {
    ...renderHook(() => useUpdateAdminReviewReportStatus(), {
      wrapper: Wrapper,
    }),
    allKey,
    detailKey,
    dismissedKey,
    openKey,
    queryClient,
  }
}

const reports = (client: QueryClient, key: readonly unknown[]) =>
  client
    .getQueryData<ReviewReportData>(key)
    ?.pages.flatMap((page) => page.data)

describe("useUpdateAdminReviewReportStatus", () => {
  beforeEach(() => {
    mocks.updateAdminReviewReportStatus.mockReset()
  })

  it("optimistically transitions lists and detail without touching reviews", async () => {
    let resolve!: (value: AdminReviewReport) => void
    mocks.updateAdminReviewReportStatus.mockReturnValue(
      new Promise<AdminReviewReport>((done) => {
        resolve = done
      }),
    )
    const { result, queryClient, allKey, openKey, dismissedKey, detailKey } =
      setup()

    act(() =>
      result.current.mutate({
        reviewReportId: "report-1",
        status: "DISMISSED",
        reviewNote: "Not a violation",
      }),
    )

    await waitFor(() =>
      expect(reports(queryClient, allKey)?.[0]).toMatchObject({
        status: "DISMISSED",
        reviewNote: "Not a violation",
      }),
    )
    expect(reports(queryClient, openKey)?.map((item) => item._id)).toEqual([
      "report-2",
    ])
    expect(reports(queryClient, dismissedKey)?.map((item) => item._id)).toEqual([
      "old",
    ])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      status: "DISMISSED",
    })
    expect(queryClient.getQueryData(queryKeys.listerReviews.lists)).toEqual({
      untouched: true,
    })

    await act(async () =>
      resolve(report("report-1", "DISMISSED", "Server note")),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("restores all exact snapshots on error", async () => {
    mocks.updateAdminReviewReportStatus.mockRejectedValue(
      new Error("Network error"),
    )
    const { result, queryClient, allKey, openKey, detailKey } = setup()

    act(() =>
      result.current.mutate({
        reviewReportId: "report-1",
        status: "REVIEWED",
      }),
    )
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(reports(queryClient, allKey)?.[0].status).toBe("OPEN")
    expect(reports(queryClient, openKey)).toHaveLength(2)
    expect(queryClient.getQueryData(detailKey)).toMatchObject({ status: "OPEN" })
  })

  it("reconciles and invalidates only review-report lists and detail", async () => {
    mocks.updateAdminReviewReportStatus.mockResolvedValue(
      report("report-1", "ACTION_TAKEN", "Canonical note"),
    )
    const { result, queryClient, allKey, detailKey } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() =>
      result.current.mutate({
        reviewReportId: "report-1",
        status: "ACTION_TAKEN",
        reviewNote: "Draft",
      }),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(reports(queryClient, allKey)?.[0].reviewNote).toBe("Canonical note")
    expect(invalidate).toHaveBeenCalledTimes(2)
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.admin.reviewReports.lists,
      refetchType: "active",
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: detailKey,
      refetchType: "active",
    })
  })

  it("serializes repeated status updates", async () => {
    let resolveFirst!: (value: AdminReviewReport) => void
    mocks.updateAdminReviewReportStatus.mockImplementation(
      ({ reviewReportId }: { reviewReportId: string }) =>
        reviewReportId === "report-1"
          ? new Promise<AdminReviewReport>((resolve) => {
              resolveFirst = resolve
            })
          : Promise.resolve(report(reviewReportId, "REVIEWED")),
    )
    const { result } = setup()

    act(() => {
      result.current.mutate({
        reviewReportId: "report-1",
        status: "REVIEWED",
      })
      result.current.mutate({
        reviewReportId: "report-2",
        status: "REVIEWED",
      })
    })
    await waitFor(() =>
      expect(mocks.updateAdminReviewReportStatus).toHaveBeenCalledTimes(1),
    )
    await act(async () => resolveFirst(report("report-1", "REVIEWED")))
    await waitFor(() =>
      expect(mocks.updateAdminReviewReportStatus).toHaveBeenCalledTimes(2),
    )
  })
})
