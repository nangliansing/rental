import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

import type { PendingPost } from "./createPendingPost"
import type { OwnerPendingPostsInfiniteData } from "./pendingPostCache"

const mocks = vi.hoisted(() => ({
  deleteOwnerPendingPost: vi.fn(),
}))

vi.mock("./deleteOwnerPendingPost", () => ({
  deleteOwnerPendingPost: mocks.deleteOwnerPendingPost,
  isOwnerPendingPostNotFoundError: (error: unknown) => {
    const value = error as { status?: number; code?: string }
    return value.status === 404 || value.code === "PENDING_POST_NOT_FOUND"
  },
}))

import { useDeleteOwnerPendingPost } from "./useDeleteOwnerPendingPost"

const post = (id: string) => ({ _id: id }) as PendingPost

function data(ids: string[]): OwnerPendingPostsInfiniteData {
  return {
    pageParams: [1],
    pages: [
      {
        success: true,
        data: ids.map(post),
        pagination: { page: 1, limit: 20, total: ids.length },
      },
    ],
  }
}

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  })
  const allKey = queryKeys.pendingPosts.ownerList({ status: "all", limit: 20 })
  const pendingKey = queryKeys.pendingPosts.ownerList({
    status: "pending",
    limit: 20,
  })
  const unrelatedKey = queryKeys.notifications.me
  queryClient.setQueryData(allKey, data(["post-1", "post-2"]))
  queryClient.setQueryData(pendingKey, data(["post-1"]))
  queryClient.setQueryData(unrelatedKey, { unread: 3 })

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  const hook = renderHook(() => useDeleteOwnerPendingPost(), {
    wrapper: Wrapper,
  })
  return { ...hook, allKey, pendingKey, queryClient, unrelatedKey }
}

function ids(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
) {
  return queryClient
    .getQueryData<OwnerPendingPostsInfiniteData>(queryKey)
    ?.pages.flatMap((page) => page.data.map((item) => item._id))
}

describe("useDeleteOwnerPendingPost", () => {
  beforeEach(() => {
    mocks.deleteOwnerPendingPost.mockReset()
  })

  it("optimistically removes every related variant and preserves unrelated data", async () => {
    let resolveRequest!: (post: PendingPost) => void
    mocks.deleteOwnerPendingPost.mockReturnValue(
      new Promise<PendingPost>((resolve) => {
        resolveRequest = resolve
      }),
    )
    const { result, queryClient, allKey, pendingKey, unrelatedKey } = setup()
    const cancel = vi.spyOn(queryClient, "cancelQueries")

    act(() => result.current.mutate("post-1"))

    await waitFor(() => expect(ids(queryClient, allKey)).toEqual(["post-2"]))
    expect(cancel).toHaveBeenCalledWith({
      queryKey: queryKeys.pendingPosts.ownerLists,
    })
    expect(ids(queryClient, pendingKey)).toEqual([])
    expect(queryClient.getQueryData(unrelatedKey)).toEqual({ unread: 3 })

    await act(async () => resolveRequest(post("post-1")))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("restores every related variant after a genuine failure", async () => {
    let rejectRequest!: (error: Error) => void
    mocks.deleteOwnerPendingPost.mockReturnValue(
      new Promise<PendingPost>((_resolve, reject) => {
        rejectRequest = reject
      }),
    )
    const { result, queryClient, allKey, pendingKey } = setup()

    act(() => result.current.mutate("post-1"))
    await waitFor(() => expect(ids(queryClient, allKey)).toEqual(["post-2"]))

    await act(async () => rejectRequest(new Error("Network failure")))

    await waitFor(() =>
      expect(ids(queryClient, allKey)).toEqual(["post-1", "post-2"]),
    )
    expect(ids(queryClient, pendingKey)).toEqual(["post-1"])
    expect(result.current.isError).toBe(true)
  })

  it("keeps the optimistic deletion when the server reports not found", async () => {
    mocks.deleteOwnerPendingPost.mockRejectedValue(
      new ApiError("Missing", 404, "PENDING_POST_NOT_FOUND"),
    )
    const { result, queryClient, allKey, pendingKey } = setup()

    act(() => result.current.mutate("post-1"))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(ids(queryClient, allKey)).toEqual(["post-2"])
    expect(ids(queryClient, pendingKey)).toEqual([])
  })

  it("invalidates only the central pending-post prefix after success", async () => {
    mocks.deleteOwnerPendingPost.mockResolvedValue(post("post-1"))
    const { result, queryClient } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate("post-1"))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.pendingPosts.ownerLists,
      refetchType: "active",
    })
  })

  it("serializes duplicate deletion requests", async () => {
    let resolveFirst!: (post: PendingPost) => void
    mocks.deleteOwnerPendingPost.mockImplementation((pendingPostId: string) => {
      if (pendingPostId === "post-1") {
        return new Promise<PendingPost>((resolve) => {
          resolveFirst = resolve
        })
      }
      return Promise.resolve(post(pendingPostId))
    })
    const { result } = setup()

    act(() => {
      result.current.mutate("post-1")
      result.current.mutate("post-2")
    })

    await waitFor(() => expect(mocks.deleteOwnerPendingPost).toHaveBeenCalledTimes(1))
    expect(mocks.deleteOwnerPendingPost).toHaveBeenLastCalledWith("post-1")

    await act(async () => resolveFirst(post("post-1")))
    await waitFor(() => expect(mocks.deleteOwnerPendingPost).toHaveBeenCalledTimes(2))
    expect(mocks.deleteOwnerPendingPost).toHaveBeenLastCalledWith("post-2")
  })
})
