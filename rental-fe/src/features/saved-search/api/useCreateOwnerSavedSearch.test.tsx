import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

import {
  CREATE_OWNER_SAVED_SEARCH_SCOPE_ID,
  useCreateOwnerSavedSearch,
} from "./useCreateOwnerSavedSearch"

const createOwnerSavedSearch = vi.hoisted(() => vi.fn())

vi.mock("./createOwnerSavedSearch", () => ({
  createOwnerSavedSearch,
}))

const createInput = {
  name: "Sukhumvit 2BR",
  geoSearch: {
    mode: "area" as const,
    bounds: {
      northEast: { lat: 13.78, lng: 100.66 },
      southWest: { lat: 13.75, lng: 100.62 },
    },
  },
}

const createdSavedSearch = {
  _id: "request-1",
  createdBy: "user-1",
  name: "Sukhumvit 2BR",
  description: null,
  status: "Waiting" as const,
  geoSearch: createInput.geoSearch,
  filters: {},
  isDeleted: false,
  deletedAt: null,
  createdAt: "2026-08-03T18:00:00.000Z",
  updatedAt: "2026-08-03T18:00:00.000Z",
}

function createWrapper(
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  }),
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }

  return { Wrapper, queryClient }
}

function spyCacheMutations(queryClient: QueryClient) {
  return {
    setQueryData: vi.spyOn(queryClient, "setQueryData"),
    invalidateQueries: vi.spyOn(queryClient, "invalidateQueries"),
    cancelQueries: vi.spyOn(queryClient, "cancelQueries"),
    removeQueries: vi.spyOn(queryClient, "removeQueries"),
  }
}

describe("useCreateOwnerSavedSearch", () => {
  beforeEach(() => {
    createOwnerSavedSearch.mockReset()
  })

  it("exposes pending/success mutation state without touching query cache", async () => {
    let resolveCreate:
      | ((value: typeof createdSavedSearch) => void)
      | undefined
    createOwnerSavedSearch.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveCreate = resolve
        }),
    )

    const { Wrapper, queryClient } = createWrapper()
    const listKey = queryKeys.savedSearches.ownerList({
      status: "Waiting",
      limit: 20,
    })
    const detailKey = queryKeys.savedSearches.ownerDetail("request-1")
    queryClient.setQueryData(listKey, { pages: [], pageParams: [] })
    queryClient.setQueryData(detailKey, { _id: "stale" })

    const spies = spyCacheMutations(queryClient)

    const { result } = renderHook(() => useCreateOwnerSavedSearch(), {
      wrapper: Wrapper,
    })

    expect(result.current.isPending).toBe(false)
    expect(result.current.isIdle).toBe(true)

    act(() => {
      result.current.mutate(createInput)
    })

    await waitFor(() => expect(result.current.isPending).toBe(true))
    expect(createOwnerSavedSearch).toHaveBeenCalledWith(
      createInput,
      expect.anything(),
    )

    await act(async () => {
      resolveCreate?.(createdSavedSearch)
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(createdSavedSearch)
    expect(result.current.error).toBeNull()
    expect(result.current.failureReason).toBeNull()
    expect(result.current.isPending).toBe(false)

    expect(spies.setQueryData).not.toHaveBeenCalled()
    expect(spies.invalidateQueries).not.toHaveBeenCalled()
    expect(spies.cancelQueries).not.toHaveBeenCalled()
    expect(spies.removeQueries).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(listKey)).toEqual({
      pages: [],
      pageParams: [],
    })
    expect(queryClient.getQueryData(detailKey)).toEqual({ _id: "stale" })
  })

  it("surfaces fetcher errors through mutation state without cache writes", async () => {
    createOwnerSavedSearch.mockRejectedValueOnce(
      new ApiError("name is required.", 422, "VALIDATION_ERROR"),
    )

    const { Wrapper, queryClient } = createWrapper()
    const spies = spyCacheMutations(queryClient)

    const { result } = renderHook(() => useCreateOwnerSavedSearch(), {
      wrapper: Wrapper,
    })

    await act(async () => {
      await expect(
        result.current.mutateAsync(createInput),
      ).rejects.toMatchObject({
        status: 422,
        code: "VALIDATION_ERROR",
      })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({
      status: 422,
      code: "VALIDATION_ERROR",
    })
    expect(result.current.data).toBeUndefined()
    expect(spies.invalidateQueries).not.toHaveBeenCalled()
    expect(spies.setQueryData).not.toHaveBeenCalled()
    expect(spies.cancelQueries).not.toHaveBeenCalled()
  })

  it.each([
    [401, "ACCESS_TOKEN_REQUIRED"],
    [403, "ACCOUNT_SUSPENDED"],
    [500, "INVALID_SAVED_SEARCH_RESPONSE"],
  ] as const)(
    "surfaces %s %s errors without cache mutation",
    async (status, code) => {
      createOwnerSavedSearch.mockRejectedValueOnce(
        new ApiError(code, status, code),
      )

      const { Wrapper, queryClient } = createWrapper()
      const spies = spyCacheMutations(queryClient)
      const { result } = renderHook(() => useCreateOwnerSavedSearch(), {
        wrapper: Wrapper,
      })

      await act(async () => {
        result.current.mutate(createInput)
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(result.current.error).toMatchObject({ status, code })
      expect(spies.setQueryData).not.toHaveBeenCalled()
      expect(spies.invalidateQueries).not.toHaveBeenCalled()
    },
  )

  it("resets mutation state after success and error", async () => {
    createOwnerSavedSearch.mockResolvedValueOnce(createdSavedSearch)

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateOwnerSavedSearch(), {
      wrapper: Wrapper,
    })

    await act(async () => {
      await result.current.mutateAsync(createInput)
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => {
      result.current.reset()
    })
    await waitFor(() => expect(result.current.isIdle).toBe(true))
    expect(result.current.data).toBeUndefined()
    expect(result.current.error).toBeNull()

    createOwnerSavedSearch.mockRejectedValueOnce(
      new ApiError("boom", 500, "INVALID_SAVED_SEARCH_RESPONSE"),
    )

    await act(async () => {
      await expect(
        result.current.mutateAsync(createInput),
      ).rejects.toBeInstanceOf(ApiError)
    })
    await waitFor(() => expect(result.current.isError).toBe(true))

    act(() => {
      result.current.reset()
    })
    await waitFor(() => expect(result.current.isIdle).toBe(true))
    expect(result.current.error).toBeNull()
  })

  it("supports consumer onSuccess without the hook writing cache", async () => {
    createOwnerSavedSearch.mockResolvedValueOnce(createdSavedSearch)
    const onSuccess = vi.fn()

    const { Wrapper, queryClient } = createWrapper()
    const spies = spyCacheMutations(queryClient)
    const { result } = renderHook(() => useCreateOwnerSavedSearch(), {
      wrapper: Wrapper,
    })

    await act(async () => {
      await result.current.mutateAsync(createInput, { onSuccess })
    })

    expect(onSuccess).toHaveBeenCalledWith(
      createdSavedSearch,
      createInput,
      undefined,
      expect.objectContaining({ client: expect.any(QueryClient) }),
    )
    expect(spies.setQueryData).not.toHaveBeenCalled()
    expect(spies.invalidateQueries).not.toHaveBeenCalled()
  })

  it("serializes concurrent creates through the shared mutation scope", async () => {
    const starts: number[] = []
    const order: string[] = []
    let active = 0
    let maxActive = 0
    let releaseFirst: (() => void) | undefined

    createOwnerSavedSearch.mockImplementation(async (input: { name: string }) => {
      starts.push(Date.now())
      active += 1
      maxActive = Math.max(maxActive, active)
      order.push(`start:${input.name}`)

      if (input.name === "first") {
        await new Promise<void>(resolve => {
          releaseFirst = resolve
        })
      }

      active -= 1
      order.push(`end:${input.name}`)
      return { ...createdSavedSearch, name: input.name }
    })

    const { Wrapper } = createWrapper()
    const first = renderHook(() => useCreateOwnerSavedSearch(), {
      wrapper: Wrapper,
    })
    const second = renderHook(() => useCreateOwnerSavedSearch(), {
      wrapper: Wrapper,
    })

    act(() => {
      first.result.current.mutate({ ...createInput, name: "first" })
      second.result.current.mutate({ ...createInput, name: "second" })
    })

    await waitFor(() => expect(order).toContain("start:first"))
    expect(order).not.toContain("start:second")

    await act(async () => {
      releaseFirst?.()
    })

    await waitFor(() => expect(first.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true))

    expect(maxActive).toBe(1)
    expect(order).toEqual([
      "start:first",
      "end:first",
      "start:second",
      "end:second",
    ])
    expect(CREATE_OWNER_SAVED_SEARCH_SCOPE_ID).toBe(
      "create-owner-saved-search",
    )
  })
})
