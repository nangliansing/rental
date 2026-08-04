import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

import {
  ownerClientRequestQueryKey,
  ownerClientRequestQueryOptions,
  useOwnerClientRequestById,
} from "./useOwnerClientRequestById"

const getOwnerClientRequestById = vi.hoisted(() => vi.fn())

vi.mock("./getOwnerClientRequestById", () => ({
  getOwnerClientRequestById,
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

function pendingSignals() {
  const signals: AbortSignal[] = []
  getOwnerClientRequestById.mockImplementation(
    (_id: string, signal?: AbortSignal) => {
      if (signal) signals.push(signal)
      return new Promise(() => undefined)
    },
  )
  return signals
}

const sampleClientRequest = {
  _id: "request-1",
  createdBy: "user-1",
  name: "Sukhumvit 2BR",
  description: null,
  status: "Waiting" as const,
  geoSearch: { mode: "area" as const },
  filters: {},
  isDeleted: false,
  deletedAt: null,
  createdAt: "2026-08-03T18:00:00.000Z",
  updatedAt: "2026-08-03T18:00:00.000Z",
}

describe("ownerClientRequestQueryOptions", () => {
  it("builds query keys from the central factory", () => {
    expect(ownerClientRequestQueryKey("request-1")).toEqual(
      queryKeys.clientRequests.ownerDetail("request-1"),
    )
    expect(ownerClientRequestQueryKey(undefined)).toEqual(
      queryKeys.clientRequests.ownerDetail(undefined),
    )
  })

  it("keeps detail keys outside the list family", () => {
    const detailKey = ownerClientRequestQueryKey("request-1")
    const listKey = queryKeys.clientRequests.ownerList({
      status: "Waiting",
      limit: 20,
    })

    expect(detailKey).toEqual(["owner-client-request", "request-1"])
    expect(detailKey[0]).not.toBe(listKey[0])
    expect(queryKeys.clientRequests.ownerDetails).toEqual([
      "owner-client-request",
    ])
    expect(detailKey.slice(0, 1)).toEqual(queryKeys.clientRequests.ownerDetails)
  })

  it("defaults to enabled for a usable id", () => {
    const options = ownerClientRequestQueryOptions("request-1")

    expect(options.enabled).toBe(true)
    expect(typeof options.queryFn).toBe("function")
  })

  it("forwards AbortSignal and id to the fetcher", async () => {
    getOwnerClientRequestById.mockResolvedValueOnce(sampleClientRequest)
    const options = ownerClientRequestQueryOptions("request-1")
    const controller = new AbortController()

    await options.queryFn!({
      signal: controller.signal,
      queryKey: options.queryKey,
      meta: undefined,
      client: new QueryClient(),
    })

    expect(getOwnerClientRequestById).toHaveBeenCalledWith(
      "request-1",
      controller.signal,
    )
  })

  it("passes an empty string through to the fetcher when id is missing", async () => {
    getOwnerClientRequestById.mockRejectedValueOnce(
      new ApiError("Client request id is required.", 422, "VALIDATION_ERROR"),
    )
    const options = ownerClientRequestQueryOptions(undefined)

    await expect(
      options.queryFn!({
        signal: new AbortController().signal,
        queryKey: options.queryKey,
        meta: undefined,
        client: new QueryClient(),
      }),
    ).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    })

    expect(getOwnerClientRequestById).toHaveBeenCalledWith(
      "",
      expect.any(AbortSignal),
    )
  })

  it.each([undefined, "", "   ", "\n"])(
    "stays disabled without a usable id (%j)",
    clientRequestId => {
      expect(ownerClientRequestQueryOptions(clientRequestId).enabled).toBe(
        false,
      )
    },
  )

  it("respects enabled=false even with a valid id", () => {
    expect(ownerClientRequestQueryOptions("request-1", false).enabled).toBe(
      false,
    )
  })

  it("uses distinct cache entries per id", () => {
    expect(ownerClientRequestQueryOptions("request-1").queryKey).not.toEqual(
      ownerClientRequestQueryOptions("request-2").queryKey,
    )
  })
})

describe("useOwnerClientRequestById", () => {
  it("aborts the previous request when the id changes", async () => {
    const signals = pendingSignals()
    const { rerender, unmount } = renderHook(
      ({ clientRequestId }: { clientRequestId: string }) =>
        useOwnerClientRequestById({ clientRequestId }),
      {
        initialProps: { clientRequestId: "request-1" },
        wrapper: createWrapper(),
      },
    )

    await waitFor(() => expect(signals).toHaveLength(1))
    rerender({ clientRequestId: "request-2" })
    await waitFor(() => expect(signals).toHaveLength(2))

    expect(signals[0]?.aborted).toBe(true)
    expect(signals[1]?.aborted).toBe(false)
    unmount()
    expect(signals[1]?.aborted).toBe(true)
  })

  it("aborts when the id is cleared", async () => {
    const signals = pendingSignals()
    const { rerender } = renderHook(
      ({ clientRequestId }: { clientRequestId?: string }) =>
        useOwnerClientRequestById({ clientRequestId }),
      {
        initialProps: { clientRequestId: "request-1" as string | undefined },
        wrapper: createWrapper(),
      },
    )

    await waitFor(() => expect(signals).toHaveLength(1))
    rerender({ clientRequestId: undefined })
    await waitFor(() => expect(signals[0]?.aborted).toBe(true))
  })

  it("does not fetch when disabled or id is missing", async () => {
    getOwnerClientRequestById.mockClear()
    const { result, rerender } = renderHook(
      ({
        clientRequestId,
        enabled,
      }: {
        clientRequestId?: string
        enabled?: boolean
      }) => useOwnerClientRequestById({ clientRequestId, enabled }),
      {
        initialProps: { clientRequestId: undefined as string | undefined },
        wrapper: createWrapper(),
      },
    )

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"))
    expect(getOwnerClientRequestById).not.toHaveBeenCalled()

    rerender({ clientRequestId: "request-1", enabled: false })
    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"))
    expect(getOwnerClientRequestById).not.toHaveBeenCalled()

    rerender({ clientRequestId: "   ", enabled: true })
    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"))
    expect(getOwnerClientRequestById).not.toHaveBeenCalled()
  })

  it("starts fetching when enabled flips to true with a valid id", async () => {
    getOwnerClientRequestById.mockResolvedValue(sampleClientRequest)
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useOwnerClientRequestById({
          clientRequestId: "request-1",
          enabled,
        }),
      {
        initialProps: { enabled: false },
        wrapper: createWrapper(),
      },
    )

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"))
    expect(getOwnerClientRequestById).not.toHaveBeenCalled()

    rerender({ enabled: true })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getOwnerClientRequestById).toHaveBeenCalledTimes(1)
  })

  it("loads a single client request", async () => {
    getOwnerClientRequestById.mockResolvedValueOnce(sampleClientRequest)

    const { result } = renderHook(
      () => useOwnerClientRequestById({ clientRequestId: "request-1" }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?._id).toBe("request-1")
    expect(getOwnerClientRequestById).toHaveBeenCalledWith(
      "request-1",
      expect.any(AbortSignal),
    )
  })

  it("surfaces not-found errors from the fetcher", async () => {
    getOwnerClientRequestById.mockRejectedValueOnce(
      new ApiError(
        "This client request could not be found.",
        404,
        "CLIENT_REQUEST_NOT_FOUND",
      ),
    )

    const { result } = renderHook(
      () => useOwnerClientRequestById({ clientRequestId: "missing" }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({
      status: 404,
      code: "CLIENT_REQUEST_NOT_FOUND",
    })
  })

  it("surfaces auth failures from the fetcher", async () => {
    getOwnerClientRequestById.mockRejectedValueOnce(
      new ApiError("Please log in to continue.", 401, "ACCESS_TOKEN_REQUIRED"),
    )

    const { result } = renderHook(
      () => useOwnerClientRequestById({ clientRequestId: "request-1" }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({
      status: 401,
      code: "ACCESS_TOKEN_REQUIRED",
    })
  })
})
