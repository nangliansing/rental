import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import type { AdminBuildingEditRequestsInfiniteData } from "./adminBuildingEditRequestCache"
import type { AdminBuildingEditRequest } from "./buildingEditRequestTypes"

const mocks = vi.hoisted(() => ({
  rejectAdminBuildingEditRequest: vi.fn(),
}))

vi.mock("./rejectAdminBuildingEditRequest", () => ({
  rejectAdminBuildingEditRequest: mocks.rejectAdminBuildingEditRequest,
}))

import { useRejectAdminBuildingEditRequest } from "./useRejectAdminBuildingEditRequest"

const request = (
  id: string,
  status: AdminBuildingEditRequest["status"] = "PENDING",
  reviewReason: string | null = null,
) => ({ _id: id, status, reviewReason }) as AdminBuildingEditRequest

const data = (
  ...requests: AdminBuildingEditRequest[]
): AdminBuildingEditRequestsInfiniteData => ({
  pageParams: [1],
  pages: [
    {
      success: true,
      data: requests,
      pagination: { page: 1, limit: 20, total: requests.length },
    },
  ],
})

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const allKey = queryKeys.admin.buildingEditRequests.list(undefined)
  const pendingKey = queryKeys.admin.buildingEditRequests.list("PENDING")
  const rejectedKey = queryKeys.admin.buildingEditRequests.list("REJECTED")
  const detailKey = queryKeys.admin.buildingEditRequests.detail("request-1")
  const source = request("request-1")
  queryClient.setQueryData(allKey, data(source, request("request-2")))
  queryClient.setQueryData(pendingKey, data(source, request("request-2")))
  queryClient.setQueryData(rejectedKey, data(request("old", "REJECTED")))
  queryClient.setQueryData(detailKey, source)
  queryClient.setQueryData(queryKeys.notifications.me, { unread: 2 })

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  return {
    ...renderHook(() => useRejectAdminBuildingEditRequest(), {
      wrapper: Wrapper,
    }),
    allKey,
    detailKey,
    pendingKey,
    queryClient,
    rejectedKey,
  }
}

const requests = (client: QueryClient, key: readonly unknown[]) =>
  client
    .getQueryData<AdminBuildingEditRequestsInfiniteData>(key)
    ?.pages.flatMap((page) => page.data)

describe("useRejectAdminBuildingEditRequest", () => {
  beforeEach(() => {
    mocks.rejectAdminBuildingEditRequest.mockReset()
  })

  it("optimistically updates lists and exact detail without unsafe insertion", async () => {
    let resolve!: (value: AdminBuildingEditRequest) => void
    mocks.rejectAdminBuildingEditRequest.mockReturnValue(
      new Promise<AdminBuildingEditRequest>((done) => {
        resolve = done
      }),
    )
    const { result, queryClient, allKey, pendingKey, rejectedKey, detailKey } =
      setup()
    const cancel = vi.spyOn(queryClient, "cancelQueries")

    act(() =>
      result.current.mutate({
        buildingEditRequestId: "request-1",
        reviewReason: "Incorrect address",
      }),
    )

    await waitFor(() =>
      expect(requests(queryClient, allKey)?.[0]).toMatchObject({
        status: "REJECTED",
        reviewReason: "Incorrect address",
      }),
    )
    expect(requests(queryClient, pendingKey)?.map((item) => item._id)).toEqual([
      "request-2",
    ])
    expect(requests(queryClient, rejectedKey)?.map((item) => item._id)).toEqual([
      "old",
    ])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      status: "REJECTED",
    })
    expect(cancel).toHaveBeenCalledWith({
      queryKey: queryKeys.admin.buildingEditRequests.lists,
    })
    expect(cancel).toHaveBeenCalledWith({ queryKey: detailKey })

    await act(async () =>
      resolve(request("request-1", "REJECTED", "Server reason")),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("restores every list and detail snapshot on error", async () => {
    mocks.rejectAdminBuildingEditRequest.mockRejectedValue(
      new Error("Network error"),
    )
    const { result, queryClient, allKey, pendingKey, detailKey } = setup()

    act(() =>
      result.current.mutate({
        buildingEditRequestId: "request-1",
        reviewReason: "Reason",
      }),
    )
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(requests(queryClient, allKey)?.[0].status).toBe("PENDING")
    expect(requests(queryClient, pendingKey)).toHaveLength(2)
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      status: "PENDING",
      reviewReason: null,
    })
  })

  it("restores list and detail queries evicted while the request is pending", async () => {
    let reject!: (error: Error) => void
    mocks.rejectAdminBuildingEditRequest.mockReturnValue(
      new Promise((_resolve, fail) => {
        reject = fail
      }),
    )
    const { result, queryClient, allKey, detailKey } = setup()

    act(() =>
      result.current.mutate({
        buildingEditRequestId: "request-1",
        reviewReason: "Reason",
      }),
    )
    await waitFor(() =>
      expect(queryClient.getQueryData(detailKey)).toMatchObject({
        status: "REJECTED",
      }),
    )

    queryClient.removeQueries({ queryKey: allKey, exact: true })
    queryClient.removeQueries({ queryKey: detailKey, exact: true })
    expect(queryClient.getQueryData(allKey)).toBeUndefined()
    expect(queryClient.getQueryData(detailKey)).toBeUndefined()

    await act(async () => reject(new Error("Network error")))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(requests(queryClient, allKey)?.[0]).toMatchObject({
      status: "PENDING",
    })
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      status: "PENDING",
    })
  })

  it("reconciles the response and invalidates only lists and exact detail", async () => {
    mocks.rejectAdminBuildingEditRequest.mockResolvedValue(
      request("request-1", "REJECTED", "Canonical reason"),
    )
    const { result, queryClient, allKey, detailKey } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() =>
      result.current.mutate({
        buildingEditRequestId: "request-1",
        reviewReason: "Draft reason",
      }),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(requests(queryClient, allKey)?.[0].reviewReason).toBe(
      "Canonical reason",
    )
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      reviewReason: "Canonical reason",
    })
    expect(invalidate).toHaveBeenCalledTimes(2)
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.admin.buildingEditRequests.lists,
      refetchType: "active",
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: detailKey,
      refetchType: "active",
    })
  })

  it("serializes repeated rejection requests", async () => {
    let resolveFirst!: (value: AdminBuildingEditRequest) => void
    mocks.rejectAdminBuildingEditRequest.mockImplementation(
      ({ buildingEditRequestId }: { buildingEditRequestId: string }) =>
        buildingEditRequestId === "request-1"
          ? new Promise<AdminBuildingEditRequest>((resolve) => {
              resolveFirst = resolve
            })
          : Promise.resolve(request(buildingEditRequestId, "REJECTED")),
    )
    const { result } = setup()

    act(() => {
      result.current.mutate({
        buildingEditRequestId: "request-1",
        reviewReason: "One",
      })
      result.current.mutate({
        buildingEditRequestId: "request-2",
        reviewReason: "Two",
      })
    })
    await waitFor(() =>
      expect(mocks.rejectAdminBuildingEditRequest).toHaveBeenCalledTimes(1),
    )
    await act(async () => resolveFirst(request("request-1", "REJECTED")))
    await waitFor(() =>
      expect(mocks.rejectAdminBuildingEditRequest).toHaveBeenCalledTimes(2),
    )
  })
})
