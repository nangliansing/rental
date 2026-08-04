import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import type { ClientRequest } from "./clientRequestParsers"
import type { SearchOwnerClientRequestsResponse } from "./clientRequestParsers"
import type { OwnerClientRequestsInfiniteData } from "./clientRequestMutationCache"
import type { DeletedOwnerClientRequest } from "./deleteOwnerClientRequest"

const mocks = vi.hoisted(() => ({
  updateOwnerClientRequest: vi.fn(),
  updateOwnerClientRequestStatus: vi.fn(),
  deleteOwnerClientRequest: vi.fn(),
}))

vi.mock("./updateOwnerClientRequest", () => ({
  updateOwnerClientRequest: mocks.updateOwnerClientRequest,
}))

vi.mock("./updateOwnerClientRequestStatus", () => ({
  updateOwnerClientRequestStatus: mocks.updateOwnerClientRequestStatus,
}))

vi.mock("./deleteOwnerClientRequest", async importOriginal => {
  const actual =
    await importOriginal<typeof import("./deleteOwnerClientRequest")>()
  return {
    ...actual,
    deleteOwnerClientRequest: mocks.deleteOwnerClientRequest,
  }
})

import { useDeleteOwnerClientRequest } from "./useDeleteOwnerClientRequest"
import { useUpdateOwnerClientRequest } from "./useUpdateOwnerClientRequest"
import { useUpdateOwnerClientRequestStatus } from "./useUpdateOwnerClientRequestStatus"

const clientRequest = (
  id: string,
  overrides: Partial<ClientRequest> = {},
): ClientRequest =>
  ({
    _id: id,
    createdBy: "user-1",
    name: `Request ${id}`,
    description: null,
    status: "Waiting",
    geoSearch: { mode: "area" },
    filters: {},
    isDeleted: false,
    deletedAt: null,
    createdAt: "2026-08-03T18:00:00.000Z",
    updatedAt: "2026-08-03T18:00:00.000Z",
    ...overrides,
  }) as ClientRequest

const deleted = (id: string): DeletedOwnerClientRequest =>
  ({
    ...clientRequest(id),
    isDeleted: true,
    deletedAt: "2026-08-04T02:00:00.000Z",
  }) as DeletedOwnerClientRequest

const listData = (
  ...items: ClientRequest[]
): OwnerClientRequestsInfiniteData => ({
  pageParams: [1],
  pages: [
    {
      success: true,
      data: items,
      pagination: { page: 1, limit: 20, total: items.length },
    } satisfies SearchOwnerClientRequestsResponse,
  ],
})

describe("owner client-request write scope", () => {
  beforeEach(() => {
    mocks.updateOwnerClientRequest.mockReset()
    mocks.updateOwnerClientRequestStatus.mockReset()
    mocks.deleteOwnerClientRequest.mockReset()
  })

  it("serializes content update with status close on the shared write scope", async () => {
    let resolveUpdate!: (value: ClientRequest) => void
    mocks.updateOwnerClientRequest.mockImplementation(
      () =>
        new Promise<ClientRequest>(resolve => {
          resolveUpdate = resolve
        }),
    )
    mocks.updateOwnerClientRequestStatus.mockResolvedValue(
      clientRequest("request-1", { status: "Closed", name: "Closed name" }),
    )

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })
    const waitingKey = queryKeys.clientRequests.ownerList({
      status: "Waiting",
      limit: 20,
    })
    const detailKey = queryKeys.clientRequests.ownerDetail("request-1")
    const source = clientRequest("request-1")

    queryClient.setQueryData(waitingKey, listData(source))
    queryClient.setQueryData(detailKey, source)

    function Wrapper({ children }: PropsWithChildren) {
      return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    }

    const { result } = renderHook(
      () => ({
        update: useUpdateOwnerClientRequest(),
        close: useUpdateOwnerClientRequestStatus(),
      }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.update.mutate({
        clientRequestId: "request-1",
        name: "Renamed first",
      })
      result.current.close.mutate({
        clientRequestId: "request-1",
        status: "Closed",
      })
    })

    await waitFor(() =>
      expect(mocks.updateOwnerClientRequest).toHaveBeenCalledTimes(1),
    )
    expect(mocks.updateOwnerClientRequestStatus).not.toHaveBeenCalled()

    await act(async () =>
      resolveUpdate(clientRequest("request-1", { name: "Renamed first" })),
    )
    await waitFor(() =>
      expect(mocks.updateOwnerClientRequestStatus).toHaveBeenCalledTimes(1),
    )
    await waitFor(() => expect(result.current.close.isSuccess).toBe(true))
  })

  it("serializes delete behind content update on the shared write scope", async () => {
    let resolveUpdate!: (value: ClientRequest) => void
    mocks.updateOwnerClientRequest.mockImplementation(
      () =>
        new Promise<ClientRequest>(resolve => {
          resolveUpdate = resolve
        }),
    )
    mocks.deleteOwnerClientRequest.mockResolvedValue(deleted("request-1"))

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })
    const waitingKey = queryKeys.clientRequests.ownerList({
      status: "Waiting",
      limit: 20,
    })
    const detailKey = queryKeys.clientRequests.ownerDetail("request-1")
    const source = clientRequest("request-1")

    queryClient.setQueryData(waitingKey, listData(source))
    queryClient.setQueryData(detailKey, source)

    function Wrapper({ children }: PropsWithChildren) {
      return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    }

    const { result } = renderHook(
      () => ({
        update: useUpdateOwnerClientRequest(),
        remove: useDeleteOwnerClientRequest(),
      }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.update.mutate({
        clientRequestId: "request-1",
        name: "Renamed first",
      })
      result.current.remove.mutate({
        clientRequestId: "request-1",
      })
    })

    await waitFor(() =>
      expect(mocks.updateOwnerClientRequest).toHaveBeenCalledTimes(1),
    )
    expect(mocks.deleteOwnerClientRequest).not.toHaveBeenCalled()

    await act(async () =>
      resolveUpdate(clientRequest("request-1", { name: "Renamed first" })),
    )
    await waitFor(() =>
      expect(mocks.deleteOwnerClientRequest).toHaveBeenCalledTimes(1),
    )
    await waitFor(() => expect(result.current.remove.isSuccess).toBe(true))
  })

  it("serializes delete behind status close on the shared write scope", async () => {
    let resolveClose!: (value: ClientRequest) => void
    mocks.updateOwnerClientRequestStatus.mockImplementation(
      () =>
        new Promise<ClientRequest>(resolve => {
          resolveClose = resolve
        }),
    )
    mocks.deleteOwnerClientRequest.mockResolvedValue(deleted("request-1"))

    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })
    const waitingKey = queryKeys.clientRequests.ownerList({
      status: "Waiting",
      limit: 20,
    })
    const detailKey = queryKeys.clientRequests.ownerDetail("request-1")
    const source = clientRequest("request-1")

    queryClient.setQueryData(waitingKey, listData(source))
    queryClient.setQueryData(detailKey, source)

    function Wrapper({ children }: PropsWithChildren) {
      return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    }

    const { result } = renderHook(
      () => ({
        close: useUpdateOwnerClientRequestStatus(),
        remove: useDeleteOwnerClientRequest(),
      }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.close.mutate({
        clientRequestId: "request-1",
        status: "Closed",
      })
      result.current.remove.mutate({
        clientRequestId: "request-1",
      })
    })

    await waitFor(() =>
      expect(mocks.updateOwnerClientRequestStatus).toHaveBeenCalledTimes(1),
    )
    expect(mocks.deleteOwnerClientRequest).not.toHaveBeenCalled()

    await act(async () =>
      resolveClose(clientRequest("request-1", { status: "Closed" })),
    )
    await waitFor(() =>
      expect(mocks.deleteOwnerClientRequest).toHaveBeenCalledTimes(1),
    )
    await waitFor(() => expect(result.current.remove.isSuccess).toBe(true))
  })
})
