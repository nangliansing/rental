import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"
import type { StatusInfiniteData } from "@/lib/status-transition-cache"

import type { ClientRequest } from "./clientRequestParsers"
import type { SearchOwnerClientRequestsResponse } from "./clientRequestParsers"
import { OWNER_CLIENT_REQUEST_WRITE_SCOPE_ID } from "./clientRequestMutationCache"
import type { DeletedOwnerClientRequest } from "./deleteOwnerClientRequest"

const mocks = vi.hoisted(() => ({
  deleteOwnerClientRequest: vi.fn(),
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

type ListData = StatusInfiniteData<
  ClientRequest,
  SearchOwnerClientRequestsResponse
>

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

const deleted = (
  id: string,
  overrides: Partial<ClientRequest> = {},
): DeletedOwnerClientRequest =>
  ({
    ...clientRequest(id),
    isDeleted: true,
    deletedAt: "2026-08-04T02:00:00.000Z",
    updatedAt: "2026-08-04T02:00:00.000Z",
    ...overrides,
    isDeleted: true,
  }) as DeletedOwnerClientRequest

const listData = (...items: ClientRequest[]): ListData => ({
  pageParams: [1],
  pages: [
    {
      success: true,
      data: items,
      pagination: { page: 1, limit: 20, total: items.length },
    },
  ],
})

function setup(options?: {
  seedDetail?: boolean
  seedWaiting?: boolean
  seedClosed?: boolean
  closedIncludesTarget?: boolean
}) {
  const {
    seedDetail = true,
    seedWaiting = true,
    seedClosed = true,
    closedIncludesTarget = false,
  } = options ?? {}

  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const waitingKey = queryKeys.clientRequests.ownerList({
    status: "Waiting",
    limit: 20,
  })
  const waitingLimit40Key = queryKeys.clientRequests.ownerList({
    status: "Waiting",
    limit: 40,
  })
  const closedKey = queryKeys.clientRequests.ownerList({
    status: "Closed",
    limit: 20,
  })
  const detailKey = queryKeys.clientRequests.ownerDetail("request-1")
  const unrelatedKey = queryKeys.notifications.me
  const source = clientRequest("request-1")

  if (seedWaiting) {
    queryClient.setQueryData(
      waitingKey,
      listData(source, clientRequest("request-2")),
    )
    queryClient.setQueryData(waitingLimit40Key, listData(source))
  }
  if (seedClosed) {
    queryClient.setQueryData(
      closedKey,
      listData(
        ...(closedIncludesTarget
          ? [clientRequest("request-1", { status: "Closed" })]
          : []),
        clientRequest("old-closed", { status: "Closed" }),
      ),
    )
  }
  if (seedDetail) {
    queryClient.setQueryData(detailKey, source)
  }
  queryClient.setQueryData(unrelatedKey, { unreadCount: 3 })

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  return {
    ...renderHook(() => useDeleteOwnerClientRequest(), { wrapper: Wrapper }),
    closedKey,
    detailKey,
    queryClient,
    source,
    unrelatedKey,
    waitingKey,
    waitingLimit40Key,
  }
}

const items = (queryClient: QueryClient, key: readonly unknown[]) =>
  queryClient.getQueryData<ListData>(key)?.pages.flatMap(page => page.data)

const ids = (queryClient: QueryClient, key: readonly unknown[]) =>
  items(queryClient, key)?.map(item => item._id)

const total = (queryClient: QueryClient, key: readonly unknown[]) =>
  queryClient.getQueryData<ListData>(key)?.pages[0]?.pagination.total

describe("useDeleteOwnerClientRequest", () => {
  beforeEach(() => {
    mocks.deleteOwnerClientRequest.mockReset()
  })

  it("cancels queries, removes from Waiting+Closed lists, and marks detail deleted", async () => {
    let resolve!: (value: DeletedOwnerClientRequest) => void
    mocks.deleteOwnerClientRequest.mockReturnValue(
      new Promise<DeletedOwnerClientRequest>(done => {
        resolve = done
      }),
    )

    const {
      result,
      queryClient,
      waitingKey,
      waitingLimit40Key,
      closedKey,
      detailKey,
      unrelatedKey,
    } = setup({ closedIncludesTarget: true })
    const cancel = vi.spyOn(queryClient, "cancelQueries")

    act(() =>
      result.current.mutate({
        clientRequestId: "request-1",
      }),
    )

    await waitFor(() =>
      expect(ids(queryClient, waitingKey)).toEqual(["request-2"]),
    )
    expect(total(queryClient, waitingKey)).toBe(1)
    expect(ids(queryClient, waitingLimit40Key)).toEqual([])
    expect(total(queryClient, waitingLimit40Key)).toBe(0)
    expect(ids(queryClient, closedKey)).toEqual(["old-closed"])
    expect(total(queryClient, closedKey)).toBe(1)
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      _id: "request-1",
      isDeleted: true,
      status: "Waiting",
    })
    expect(
      queryClient.getQueryData<ClientRequest>(detailKey)?.deletedAt,
    ).toEqual(expect.any(String))
    expect(queryClient.getQueryData(unrelatedKey)).toEqual({ unreadCount: 3 })
    expect(cancel).toHaveBeenCalledWith({
      queryKey: queryKeys.clientRequests.ownerLists,
    })
    expect(cancel).toHaveBeenCalledWith({ queryKey: detailKey })

    await act(async () => resolve(deleted("request-1")))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("removes a Closed request from Closed lists without inventing Waiting rows", async () => {
    mocks.deleteOwnerClientRequest.mockReturnValue(new Promise(() => undefined))
    const { result, queryClient, waitingKey, closedKey, detailKey } = setup({
      seedWaiting: false,
      closedIncludesTarget: true,
    })
    const closed = clientRequest("request-1", { status: "Closed" })
    queryClient.setQueryData(detailKey, closed)
    queryClient.setQueryData(
      closedKey,
      listData(closed, clientRequest("old-closed", { status: "Closed" })),
    )

    act(() => result.current.mutate({ clientRequestId: "request-1" }))

    await waitFor(() =>
      expect(ids(queryClient, closedKey)).toEqual(["old-closed"]),
    )
    expect(queryClient.getQueryData(waitingKey)).toBeUndefined()
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      status: "Closed",
      isDeleted: true,
    })
  })

  it("removes an item on a later infinite page and decrements every page total", async () => {
    mocks.deleteOwnerClientRequest.mockReturnValue(new Promise(() => undefined))
    const { result, queryClient, waitingKey, detailKey } = setup({
      seedClosed: false,
    })

    queryClient.setQueryData(waitingKey, {
      pageParams: [1, 2],
      pages: [
        {
          success: true,
          data: [clientRequest("request-2")],
          pagination: { page: 1, limit: 1, total: 3 },
        },
        {
          success: true,
          data: [clientRequest("request-1"), clientRequest("request-3")],
          pagination: { page: 2, limit: 1, total: 3 },
        },
      ],
    } satisfies ListData)

    act(() => result.current.mutate({ clientRequestId: "request-1" }))

    await waitFor(() =>
      expect(ids(queryClient, waitingKey)).toEqual(["request-2", "request-3"]),
    )
    expect(
      queryClient.getQueryData<ListData>(waitingKey)?.pages.map(page => ({
        ids: page.data.map(item => item._id),
        total: page.pagination.total,
      })),
    ).toEqual([
      { ids: ["request-2"], total: 2 },
      { ids: ["request-3"], total: 2 },
    ])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      isDeleted: true,
    })
  })

  it("marks detail deleted when the item is only in detail cache", async () => {
    mocks.deleteOwnerClientRequest.mockReturnValue(new Promise(() => undefined))
    const { result, queryClient, detailKey, waitingKey } = setup({
      seedWaiting: false,
      seedClosed: false,
    })

    act(() => result.current.mutate({ clientRequestId: "request-1" }))

    await waitFor(() =>
      expect(queryClient.getQueryData(detailKey)).toMatchObject({
        isDeleted: true,
      }),
    )
    expect(queryClient.getQueryData(waitingKey)).toBeUndefined()
  })

  it("removes from lists and seeds deleted detail when detail cache is missing", async () => {
    mocks.deleteOwnerClientRequest.mockReturnValue(new Promise(() => undefined))
    const { result, queryClient, waitingKey, detailKey } = setup({
      seedDetail: false,
    })

    act(() => result.current.mutate({ clientRequestId: "request-1" }))

    await waitFor(() =>
      expect(ids(queryClient, waitingKey)).toEqual(["request-2"]),
    )
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      _id: "request-1",
      isDeleted: true,
    })
  })

  it("is a no-op on existing caches when the request is not loaded, then reconciles detail", async () => {
    mocks.deleteOwnerClientRequest.mockResolvedValue(deleted("missing"))
    const { result, queryClient, waitingKey, closedKey, detailKey } = setup()

    act(() => result.current.mutate({ clientRequestId: "missing" }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(ids(queryClient, waitingKey)).toEqual(["request-1", "request-2"])
    expect(ids(queryClient, closedKey)).toEqual(["old-closed"])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      isDeleted: false,
    })
    expect(
      queryClient.getQueryData(
        queryKeys.clientRequests.ownerDetail("missing"),
      ),
    ).toMatchObject({
      _id: "missing",
      isDeleted: true,
    })
  })

  it("succeeds without inventing list entries when caches are empty", async () => {
    mocks.deleteOwnerClientRequest.mockResolvedValue(deleted("request-1"))
    const { result, queryClient, waitingKey, closedKey, detailKey } = setup()
    queryClient.clear()

    act(() => result.current.mutate({ clientRequestId: "request-1" }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(queryClient.getQueryData(waitingKey)).toBeUndefined()
    expect(queryClient.getQueryData(closedKey)).toBeUndefined()
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      _id: "request-1",
      isDeleted: true,
    })
  })

  it("restores Waiting/Closed lists and detail after failure", async () => {
    mocks.deleteOwnerClientRequest.mockRejectedValue(new Error("Network error"))
    const {
      result,
      queryClient,
      waitingKey,
      waitingLimit40Key,
      closedKey,
      detailKey,
      unrelatedKey,
    } = setup({ closedIncludesTarget: true })
    const unrelated = queryClient.getQueryData(unrelatedKey)

    act(() => result.current.mutate({ clientRequestId: "request-1" }))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(ids(queryClient, waitingKey)).toEqual(["request-1", "request-2"])
    expect(total(queryClient, waitingKey)).toBe(2)
    expect(ids(queryClient, waitingLimit40Key)).toEqual(["request-1"])
    expect(ids(queryClient, closedKey)).toEqual(["request-1", "old-closed"])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      isDeleted: false,
      deletedAt: null,
    })
    expect(queryClient.getQueryData(unrelatedKey)).toBe(unrelated)
  })

  it.each([
    [422, "VALIDATION_ERROR"],
    [403, "ACCOUNT_SUSPENDED"],
    [500, "INTERNAL_ERROR"],
  ] as const)("rolls back after API %s %s", async (status, code) => {
    mocks.deleteOwnerClientRequest.mockRejectedValue(
      new ApiError(code, status, code),
    )
    const { result, queryClient, waitingKey, detailKey } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate({ clientRequestId: "request-1" }))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toMatchObject({ status, code })
    expect(ids(queryClient, waitingKey)).toEqual(["request-1", "request-2"])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      isDeleted: false,
    })
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("does not treat a bare 404 as idempotent success", async () => {
    mocks.deleteOwnerClientRequest.mockRejectedValue(
      new ApiError("Missing", 404),
    )
    const { result, queryClient, waitingKey, detailKey } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate({ clientRequestId: "request-1" }))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(ids(queryClient, waitingKey)).toEqual(["request-1", "request-2"])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      isDeleted: false,
    })
    expect(invalidate).not.toHaveBeenCalled()
  })

  it("treats CLIENT_REQUEST_NOT_FOUND as idempotent success", async () => {
    mocks.deleteOwnerClientRequest.mockRejectedValue(
      new ApiError("missing", 404, "CLIENT_REQUEST_NOT_FOUND"),
    )
    const { result, queryClient, waitingKey, detailKey } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() =>
      result.current.mutate({
        clientRequestId: "  request-1  ",
      }),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeNull()
    expect(ids(queryClient, waitingKey)).toEqual(["request-2"])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      isDeleted: true,
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.clientRequests.ownerLists,
      refetchType: "active",
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: detailKey,
      refetchType: "active",
    })
  })

  it("re-removes list copies recreated while an idempotent delete is pending", async () => {
    let reject!: (error: Error) => void
    mocks.deleteOwnerClientRequest.mockReturnValue(
      new Promise<DeletedOwnerClientRequest>((_resolve, rejectRequest) => {
        reject = rejectRequest
      }),
    )
    const { result, queryClient, waitingKey, detailKey } = setup()

    act(() => result.current.mutate({ clientRequestId: "request-1" }))
    await waitFor(() =>
      expect(ids(queryClient, waitingKey)).toEqual(["request-2"]),
    )

    queryClient.setQueryData(
      waitingKey,
      listData(clientRequest("request-1"), clientRequest("request-2")),
    )
    queryClient.setQueryData(detailKey, clientRequest("request-1"))

    await act(async () => {
      reject(new ApiError("missing", 404, "CLIENT_REQUEST_NOT_FOUND"))
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(ids(queryClient, waitingKey)).toEqual(["request-2"])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      isDeleted: true,
    })
  })

  it("re-removes list copies recreated while a successful delete is pending", async () => {
    let resolve!: (value: DeletedOwnerClientRequest) => void
    mocks.deleteOwnerClientRequest.mockReturnValue(
      new Promise<DeletedOwnerClientRequest>(done => {
        resolve = done
      }),
    )
    const { result, queryClient, waitingKey, detailKey } = setup()

    act(() => result.current.mutate({ clientRequestId: "request-1" }))
    await waitFor(() =>
      expect(ids(queryClient, waitingKey)).toEqual(["request-2"]),
    )

    queryClient.setQueryData(
      waitingKey,
      listData(clientRequest("request-1"), clientRequest("request-2")),
    )
    queryClient.setQueryData(detailKey, clientRequest("request-1"))

    await act(async () =>
      resolve(
        deleted("request-1", {
          name: "Server deleted",
          deletedAt: "2026-08-04T03:00:00.000Z",
        }),
      ),
    )
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(ids(queryClient, waitingKey)).toEqual(["request-2"])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      name: "Server deleted",
      isDeleted: true,
      deletedAt: "2026-08-04T03:00:00.000Z",
    })
  })

  it("reconciles server deletedAt and invalidates on success only", async () => {
    mocks.deleteOwnerClientRequest.mockResolvedValue(
      deleted("request-1", {
        name: "Canonical",
        deletedAt: "2026-08-04T03:00:00.000Z",
      }),
    )
    const { result, queryClient, waitingKey, detailKey } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate({ clientRequestId: "request-1" }))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(ids(queryClient, waitingKey)).toEqual(["request-2"])
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      name: "Canonical",
      isDeleted: true,
      deletedAt: "2026-08-04T03:00:00.000Z",
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.clientRequests.ownerLists,
      refetchType: "active",
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: detailKey,
      refetchType: "active",
    })
  })

  it("does not invalidate after failure", async () => {
    mocks.deleteOwnerClientRequest.mockRejectedValue(new Error("Network error"))
    const { result, queryClient } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate({ clientRequestId: "request-1" }))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(invalidate).not.toHaveBeenCalled()
  })

  it("does not call the endpoint or mutate caches when cancellation fails", async () => {
    const { result, queryClient, waitingKey, detailKey, source } = setup()
    const waitingSnapshot = queryClient.getQueryData(waitingKey)
    vi.spyOn(queryClient, "cancelQueries").mockRejectedValueOnce(
      new Error("Cancellation failed"),
    )

    act(() => result.current.mutate({ clientRequestId: "request-1" }))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mocks.deleteOwnerClientRequest).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(waitingKey)).toEqual(waitingSnapshot)
    expect(queryClient.getQueryData(detailKey)).toEqual(source)
  })

  it("serializes repeated deletes through the write scope", async () => {
    let resolveFirst!: (value: DeletedOwnerClientRequest) => void
    mocks.deleteOwnerClientRequest.mockImplementation(
      ({ clientRequestId }: { clientRequestId: string }) =>
        clientRequestId.trim() === "request-1"
          ? new Promise<DeletedOwnerClientRequest>(resolve => {
              resolveFirst = resolve
            })
          : Promise.resolve(deleted(clientRequestId.trim())),
    )
    const { result, queryClient } = setup()
    queryClient.setQueryData(
      queryKeys.clientRequests.ownerDetail("request-2"),
      clientRequest("request-2"),
    )

    act(() => {
      result.current.mutate({ clientRequestId: "request-1" })
      result.current.mutate({ clientRequestId: "request-2" })
    })

    await waitFor(() =>
      expect(mocks.deleteOwnerClientRequest).toHaveBeenCalledTimes(1),
    )
    await act(async () => resolveFirst(deleted("request-1")))
    await waitFor(() =>
      expect(mocks.deleteOwnerClientRequest).toHaveBeenCalledTimes(2),
    )
  })

  it("does not let a failed older mutation restore a newer optimistic delete", async () => {
    let rejectFirst!: (error: Error) => void
    let resolveSecond!: (value: DeletedOwnerClientRequest) => void
    let call = 0

    mocks.deleteOwnerClientRequest.mockImplementation(() => {
      call += 1
      if (call === 1) {
        return new Promise<DeletedOwnerClientRequest>((_resolve, reject) => {
          rejectFirst = reject
        })
      }
      return new Promise<DeletedOwnerClientRequest>(resolve => {
        resolveSecond = resolve
      })
    })

    const { result, queryClient, waitingKey, detailKey } = setup()

    act(() => result.current.mutate({ clientRequestId: "request-1" }))
    await waitFor(() =>
      expect(ids(queryClient, waitingKey)).toEqual(["request-2"]),
    )

    queryClient.setQueryData(
      waitingKey,
      listData(clientRequest("request-1"), clientRequest("request-2")),
    )
    queryClient.setQueryData(detailKey, clientRequest("request-1"))

    act(() => result.current.mutate({ clientRequestId: "request-1" }))
    await waitFor(() =>
      expect(ids(queryClient, waitingKey)).toEqual(["request-2"]),
    )

    await act(async () => {
      rejectFirst(new Error("stale failure"))
    })
    await waitFor(() =>
      expect(ids(queryClient, waitingKey)).toEqual(["request-2"]),
    )
    expect(queryClient.getQueryData(detailKey)).toMatchObject({
      isDeleted: true,
    })

    await act(async () => {
      resolveSecond(deleted("request-1", { name: "Server deleted" }))
    })
    await waitFor(() =>
      expect(queryClient.getQueryData(detailKey)).toMatchObject({
        name: "Server deleted",
        isDeleted: true,
      }),
    )
  })

  it("uses the shared owner client-request write scope", () => {
    expect(OWNER_CLIENT_REQUEST_WRITE_SCOPE_ID).toBe(
      "owner-client-request-write",
    )
  })
})
