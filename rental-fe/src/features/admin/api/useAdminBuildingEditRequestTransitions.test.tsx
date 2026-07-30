import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import type { AdminBuildingEditRequestsInfiniteData } from "./adminBuildingEditRequestCache"
import type {
  AdminBuildingEditRequest,
  AdminBuildingEditRequestBuilding,
} from "./buildingEditRequestTypes"

const mocks = vi.hoisted(() => ({
  approve: vi.fn(),
  reject: vi.fn(),
}))

vi.mock("./approveAdminBuildingEditRequest", () => ({
  approveAdminBuildingEditRequest: mocks.approve,
}))
vi.mock("./rejectAdminBuildingEditRequest", () => ({
  rejectAdminBuildingEditRequest: mocks.reject,
}))

import { useApproveAdminBuildingEditRequest } from "./useApproveAdminBuildingEditRequest"
import { useRejectAdminBuildingEditRequest } from "./useRejectAdminBuildingEditRequest"

const request = (
  status: AdminBuildingEditRequest["status"] = "PENDING",
  reason: string | null = null,
) =>
  ({
    _id: "request-1",
    buildingId: "building-1",
    status,
    reviewReason: reason,
  }) as AdminBuildingEditRequest

const building = {
  _id: "building-1",
  buildingType: "CONDO",
  facilities: [],
  security: [],
  location: { type: "Point", coordinates: [100.5, 13.7] },
  name: "Building",
  address: null,
  minRent: null,
  maxRent: null,
} as AdminBuildingEditRequestBuilding

const infiniteData = (
  item: AdminBuildingEditRequest,
): AdminBuildingEditRequestsInfiniteData => ({
  pageParams: [1],
  pages: [
    {
      success: true,
      data: [item],
      pagination: { page: 1, limit: 20, total: 1 },
    },
  ],
})

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })
  const listKey = queryKeys.admin.buildingEditRequests.list(undefined)
  const detailKey =
    queryKeys.admin.buildingEditRequests.detail("request-1")
  queryClient.setQueryData(listKey, infiniteData(request()))
  queryClient.setQueryData(detailKey, request())

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  return {
    ...renderHook(
      () => ({
        approve: useApproveAdminBuildingEditRequest(),
        reject: useRejectAdminBuildingEditRequest(),
      }),
      { wrapper: Wrapper },
    ),
    detailKey,
    listKey,
    queryClient,
  }
}

describe("admin building-edit transition coordination", () => {
  beforeEach(() => {
    mocks.approve.mockReset()
    mocks.reject.mockReset()
  })

  it("serializes server writes while preserving the latest optimistic intent", async () => {
    let resolveApprove!: (value: {
      request: AdminBuildingEditRequest
      building: AdminBuildingEditRequestBuilding
    }) => void
    mocks.approve.mockReturnValue(
      new Promise((resolve) => {
        resolveApprove = resolve
      }),
    )
    mocks.reject.mockResolvedValue(
      request("REJECTED", "Canonical rejection"),
    )
    const { result, queryClient, detailKey } = setup()

    act(() => {
      result.current.approve.mutate({
        buildingEditRequestId: "request-1",
        reviewReason: "Approve",
      })
      result.current.reject.mutate({
        buildingEditRequestId: "request-1",
        reviewReason: "Reject",
      })
    })

    await waitFor(() =>
      expect(queryClient.getQueryData(detailKey)).toMatchObject({
        status: "REJECTED",
        reviewReason: "Reject",
      }),
    )
    expect(mocks.approve).toHaveBeenCalledTimes(1)
    expect(mocks.reject).not.toHaveBeenCalled()

    await act(async () => {
      resolveApprove({
        request: request("APPROVED", "Canonical approval"),
        building,
      })
    })

    await waitFor(() => expect(mocks.reject).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(queryClient.getQueryData(detailKey)).toMatchObject({
        status: "REJECTED",
        reviewReason: "Canonical rejection",
      }),
    )
  })

  it("does not let a failed approval roll back over a queued rejection", async () => {
    let rejectApprove!: (error: Error) => void
    mocks.approve.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectApprove = reject
      }),
    )
    mocks.reject.mockResolvedValue(request("REJECTED", "Final rejection"))
    const { result, queryClient, detailKey } = setup()

    act(() => {
      result.current.approve.mutate({
        buildingEditRequestId: "request-1",
      })
      result.current.reject.mutate({
        buildingEditRequestId: "request-1",
        reviewReason: "Final rejection",
      })
    })
    await waitFor(() =>
      expect(queryClient.getQueryData(detailKey)).toMatchObject({
        status: "REJECTED",
        reviewReason: "Final rejection",
      }),
    )

    await act(async () => rejectApprove(new Error("Approval failed")))

    await waitFor(() => expect(mocks.reject).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(queryClient.getQueryData(detailKey)).toMatchObject({
        status: "REJECTED",
        reviewReason: "Final rejection",
      }),
    )
  })
})
