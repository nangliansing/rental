import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

const mocks = vi.hoisted(() => ({ createBuildingEditRequest: vi.fn() }))
vi.mock("./createBuildingEditRequest", () => ({
  createBuildingEditRequest: mocks.createBuildingEditRequest,
}))

import { useCreateBuildingEditRequest } from "./useCreateBuildingEditRequest"

const input = { buildingId: "building-1", proposedBuilding: {} } as never
const request = { _id: "request-1", status: "PENDING" }

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const pendingKey = queryKeys.admin.buildingEditRequests.list("PENDING")
  const cached = { pages: [{ data: [{ _id: "existing-request" }] }] }
  queryClient.setQueryData(pendingKey, cached)

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  return {
    ...renderHook(() => useCreateBuildingEditRequest(), { wrapper: Wrapper }),
    cached,
    pendingKey,
    queryClient,
  }
}

describe("useCreateBuildingEditRequest", () => {
  beforeEach(() => {
    mocks.createBuildingEditRequest.mockReset()
  })

  it("cancels the central list without fabricating admin data", async () => {
    let resolve!: (value: typeof request) => void
    mocks.createBuildingEditRequest.mockImplementation(
      () => new Promise((done) => { resolve = done }),
    )
    const { result, queryClient, pendingKey, cached } = setup()
    const cancel = vi.spyOn(queryClient, "cancelQueries")

    act(() => result.current.mutate(input))
    await waitFor(() =>
      expect(mocks.createBuildingEditRequest).toHaveBeenCalledOnce(),
    )
    expect(cancel).toHaveBeenCalledWith({
      queryKey: queryKeys.admin.buildingEditRequests.lists,
    })
    expect(queryClient.getQueryData(pendingKey)).toEqual(cached)

    await act(async () => resolve(request))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("preserves cache and skips invalidation on failure", async () => {
    mocks.createBuildingEditRequest.mockRejectedValue(new Error("Network error"))
    const { result, queryClient, pendingKey, cached } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate(input))
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(pendingKey)).toEqual(cached)
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("invalidates only active admin lists on success", async () => {
    mocks.createBuildingEditRequest.mockResolvedValue(request)
    const { result, queryClient } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate(input))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.admin.buildingEditRequests.lists,
      refetchType: "active",
    })
  })
})
