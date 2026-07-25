import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { relatedBuildingQueryKeys } from "@/features/buildings/api/buildingMutationCache"
import { queryKeys } from "@/lib/query-keys"

import type { AdminBuildingEditRequestsInfiniteData } from "./adminBuildingEditRequestCache"
import type {
  AdminBuildingEditRequest,
  AdminBuildingEditRequestBuilding,
} from "./buildingEditRequestTypes"

const mocks = vi.hoisted(() => ({
  approveAdminBuildingEditRequest: vi.fn(),
}))

vi.mock("./approveAdminBuildingEditRequest", () => ({
  approveAdminBuildingEditRequest: mocks.approveAdminBuildingEditRequest,
}))

import { useApproveAdminBuildingEditRequest } from "./useApproveAdminBuildingEditRequest"

const request = (
  status: AdminBuildingEditRequest["status"] = "PENDING",
  reviewReason: string | null = null,
) =>
  ({ _id: "request-1", status, reviewReason }) as AdminBuildingEditRequest

const building = {
  _id: "building-1",
  name: "Updated Building",
  buildingType: "CONDO",
  facilities: ["POOL"],
  security: ["CCTV"],
  location: { type: "Point", coordinates: [100.5, 13.7] },
  address: "New address",
  isActive: true,
  minRent: 10_000,
  maxRent: 20_000,
} as AdminBuildingEditRequestBuilding

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
  const detailKey = queryKeys.admin.buildingEditRequests.detail("request-1")
  queryClient.setQueryData(allKey, data(request()))
  queryClient.setQueryData(pendingKey, data(request()))
  queryClient.setQueryData(detailKey, request())

  const projectionKeys = relatedBuildingQueryKeys(building._id)
  projectionKeys.forEach((key, index) => {
    queryClient.setQueryData(key, {
      index,
      building: {
        _id: building._id,
        name: "Old Building",
        buildingType: "APARTMENT",
        location: { type: "Point", coordinates: [1, 2] },
      },
      listing: { _id: building._id, rent: 12_000 },
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
    ...renderHook(() => useApproveAdminBuildingEditRequest(), {
      wrapper: Wrapper,
    }),
    allKey,
    detailKey,
    pendingKey,
    projectionKeys,
    queryClient,
  }
}

const requests = (client: QueryClient, key: readonly unknown[]) =>
  client
    .getQueryData<AdminBuildingEditRequestsInfiniteData>(key)
    ?.pages.flatMap((page) => page.data)

describe("useApproveAdminBuildingEditRequest", () => {
  beforeEach(() => {
    mocks.approveAdminBuildingEditRequest.mockReset()
  })

  it("optimistically transitions only deterministic request caches", async () => {
    let resolve!: (value: {
      request: AdminBuildingEditRequest
      building: AdminBuildingEditRequestBuilding
    }) => void
    mocks.approveAdminBuildingEditRequest.mockReturnValue(
      new Promise((done) => {
        resolve = done
      }),
    )
    const { result, queryClient, allKey, pendingKey, detailKey, projectionKeys } =
      setup()

    act(() =>
      result.current.mutate({
        buildingEditRequestId: "request-1",
        reviewReason: "Verified",
      }),
    )

    await waitFor(() =>
      expect(requests(queryClient, allKey)?.[0]).toMatchObject({
        status: "APPROVED",
        reviewReason: "Verified",
      }),
    )
    expect(requests(queryClient, pendingKey)).toEqual([])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      status: "APPROVED",
    })
    expect(queryClient.getQueryData(projectionKeys[0])).toMatchObject({
      building: { name: "Old Building" },
    })

    await act(async () => resolve({ request: request("APPROVED"), building }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("restores request lists and detail after an error", async () => {
    mocks.approveAdminBuildingEditRequest.mockRejectedValue(
      new Error("Network error"),
    )
    const { result, queryClient, allKey, pendingKey, detailKey } = setup()

    act(() =>
      result.current.mutate({ buildingEditRequestId: "request-1" }),
    )
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(requests(queryClient, allKey)?.[0].status).toBe("PENDING")
    expect(requests(queryClient, pendingKey)).toHaveLength(1)
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      status: "PENDING",
    })
  })

  it("patches recognizable building projections and invalidates every related key", async () => {
    mocks.approveAdminBuildingEditRequest.mockResolvedValue({
      request: request("APPROVED", "Canonical reason"),
      building,
    })
    const { result, queryClient, projectionKeys } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() =>
      result.current.mutate({ buildingEditRequestId: "request-1" }),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    projectionKeys.forEach((key) => {
      expect(queryClient.getQueryData(key)).toMatchObject({
        building: { name: "Updated Building", address: "New address" },
        // An object with the same id but no building shape must stay untouched.
        listing: { _id: "building-1", rent: 12_000 },
      })
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: key,
        refetchType: "active",
      })
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.admin.buildingEditRequests.lists,
      refetchType: "active",
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.admin.buildingEditRequests.detail("request-1"),
      refetchType: "active",
    })
  })

  it("serializes repeated approvals", async () => {
    let resolveFirst!: (value: {
      request: AdminBuildingEditRequest
      building: AdminBuildingEditRequestBuilding
    }) => void
    mocks.approveAdminBuildingEditRequest.mockImplementation(
      ({ buildingEditRequestId }: { buildingEditRequestId: string }) =>
        buildingEditRequestId === "request-1"
          ? new Promise((resolve) => {
              resolveFirst = resolve
            })
          : Promise.resolve({ request: request("APPROVED"), building }),
    )
    const { result } = setup()

    act(() => {
      result.current.mutate({ buildingEditRequestId: "request-1" })
      result.current.mutate({ buildingEditRequestId: "request-2" })
    })
    await waitFor(() =>
      expect(mocks.approveAdminBuildingEditRequest).toHaveBeenCalledTimes(1),
    )
    await act(async () =>
      resolveFirst({ request: request("APPROVED"), building }),
    )
    await waitFor(() =>
      expect(mocks.approveAdminBuildingEditRequest).toHaveBeenCalledTimes(2),
    )
  })
})
