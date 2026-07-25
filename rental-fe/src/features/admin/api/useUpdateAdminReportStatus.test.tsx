import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"
import type { StatusInfiniteData } from "@/lib/status-transition-cache"

import type {
  AdminReport,
  SearchAdminReportsResponse,
} from "./searchAdminReports"

const mocks = vi.hoisted(() => ({ updateAdminReportStatus: vi.fn() }))

vi.mock("./updateAdminReportStatus", () => ({
  updateAdminReportStatus: mocks.updateAdminReportStatus,
}))

import { useUpdateAdminReportStatus } from "./useUpdateAdminReportStatus"

type ReportData = StatusInfiniteData<AdminReport, SearchAdminReportsResponse>

const report = (
  id: string,
  status: AdminReport["status"] = "OPEN",
  reviewNote: string | null = null,
) => ({ _id: id, status, reviewNote }) as AdminReport

const data = (...reports: AdminReport[]): ReportData => ({
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
  const allKey = queryKeys.admin.reports.list(undefined)
  const openKey = queryKeys.admin.reports.list("OPEN")
  const dismissedKey = queryKeys.admin.reports.list("DISMISSED")
  const detailKey = queryKeys.admin.reports.detail("report-1")
  const source = report("report-1")
  queryClient.setQueryData(allKey, data(source, report("report-2")))
  queryClient.setQueryData(openKey, data(source, report("report-2")))
  queryClient.setQueryData(dismissedKey, data(report("old", "DISMISSED")))
  queryClient.setQueryData(detailKey, source)
  queryClient.setQueryData(queryKeys.notifications.me, { unread: 3 })

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  return {
    ...renderHook(() => useUpdateAdminReportStatus(), { wrapper: Wrapper }),
    allKey,
    detailKey,
    dismissedKey,
    openKey,
    queryClient,
  }
}

const reports = (client: QueryClient, key: readonly unknown[]) =>
  client
    .getQueryData<ReportData>(key)
    ?.pages.flatMap((page) => page.data)

describe("useUpdateAdminReportStatus", () => {
  beforeEach(() => {
    mocks.updateAdminReportStatus.mockReset()
  })

  it("optimistically transitions lists and exact detail", async () => {
    let resolve!: (value: AdminReport) => void
    mocks.updateAdminReportStatus.mockReturnValue(
      new Promise<AdminReport>((done) => {
        resolve = done
      }),
    )
    const { result, queryClient, allKey, openKey, dismissedKey, detailKey } =
      setup()
    const cancel = vi.spyOn(queryClient, "cancelQueries")

    act(() =>
      result.current.mutate({
        reportId: "report-1",
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
    expect(cancel).toHaveBeenCalledWith({
      queryKey: queryKeys.admin.reports.lists,
    })
    expect(cancel).toHaveBeenCalledWith({ queryKey: detailKey })

    await act(async () =>
      resolve(report("report-1", "DISMISSED", "Server note")),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("restores every exact snapshot after failure", async () => {
    mocks.updateAdminReportStatus.mockRejectedValue(new Error("Network error"))
    const { result, queryClient, allKey, openKey, detailKey } = setup()

    act(() =>
      result.current.mutate({ reportId: "report-1", status: "REVIEWED" }),
    )
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(reports(queryClient, allKey)?.[0].status).toBe("OPEN")
    expect(reports(queryClient, openKey)).toHaveLength(2)
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      status: "OPEN",
      reviewNote: null,
    })
  })

  it("reconciles server data and invalidates only report lists and detail", async () => {
    mocks.updateAdminReportStatus.mockResolvedValue(
      report("report-1", "ACTION_TAKEN", "Canonical note"),
    )
    const { result, queryClient, allKey, detailKey } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() =>
      result.current.mutate({
        reportId: "report-1",
        status: "ACTION_TAKEN",
        reviewNote: "Draft",
      }),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(reports(queryClient, allKey)?.[0].reviewNote).toBe("Canonical note")
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      reviewNote: "Canonical note",
    })
    expect(invalidate).toHaveBeenCalledTimes(2)
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.admin.reports.lists,
      refetchType: "active",
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: detailKey,
      refetchType: "active",
    })
  })

  it("serializes repeated status updates", async () => {
    let resolveFirst!: (value: AdminReport) => void
    mocks.updateAdminReportStatus.mockImplementation(
      ({ reportId }: { reportId: string }) =>
        reportId === "report-1"
          ? new Promise<AdminReport>((resolve) => {
              resolveFirst = resolve
            })
          : Promise.resolve(report(reportId, "REVIEWED")),
    )
    const { result } = setup()

    act(() => {
      result.current.mutate({ reportId: "report-1", status: "REVIEWED" })
      result.current.mutate({ reportId: "report-2", status: "REVIEWED" })
    })
    await waitFor(() =>
      expect(mocks.updateAdminReportStatus).toHaveBeenCalledTimes(1),
    )
    await act(async () => resolveFirst(report("report-1", "REVIEWED")))
    await waitFor(() =>
      expect(mocks.updateAdminReportStatus).toHaveBeenCalledTimes(2),
    )
  })
})
