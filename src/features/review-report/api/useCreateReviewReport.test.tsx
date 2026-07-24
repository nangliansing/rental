import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

const mocks = vi.hoisted(() => ({ createReviewReport: vi.fn() }))
vi.mock("./createReviewReport", () => ({
  createReviewReport: mocks.createReviewReport,
}))

import { useCreateReviewReport } from "./useCreateReviewReport"

const input = { reviewId: "review-1", reason: "SPAM" as const }
const report = { _id: "report-1", ...input }

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const openKey = queryKeys.admin.reviewReports.list("OPEN")
  const cached = { pages: [{ data: [{ _id: "existing-report" }] }] }
  queryClient.setQueryData(openKey, cached)

  function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  return { ...renderHook(() => useCreateReviewReport(), { wrapper: Wrapper }), cached, openKey, queryClient }
}

describe("useCreateReviewReport", () => {
  beforeEach(() => {
    mocks.createReviewReport.mockReset()
  })

  it("cancels the related list without fabricating optimistic data", async () => {
    let resolve!: (value: typeof report) => void
    mocks.createReviewReport.mockImplementation(() => new Promise((done) => { resolve = done }))
    const { result, queryClient, openKey, cached } = setup()
    const cancel = vi.spyOn(queryClient, "cancelQueries")

    act(() => result.current.mutate(input))
    await waitFor(() => expect(mocks.createReviewReport).toHaveBeenCalledOnce())
    expect(cancel).toHaveBeenCalledWith({ queryKey: queryKeys.admin.reviewReports.lists })
    expect(queryClient.getQueryData(openKey)).toEqual(cached)

    await act(async () => resolve(report))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("does not change or invalidate cache state on error", async () => {
    mocks.createReviewReport.mockRejectedValue(new Error("Network error"))
    const { result, queryClient, openKey, cached } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate(input))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(openKey)).toEqual(cached)
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("invalidates only active admin review-report lists on success", async () => {
    mocks.createReviewReport.mockResolvedValue(report)
    const { result, queryClient } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate(input))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidate).toHaveBeenCalledTimes(1)
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.admin.reviewReports.lists,
      refetchType: "active",
    })
  })
})
