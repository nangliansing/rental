import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "@/lib/api-client"
import { queryKeys } from "@/lib/query-keys"

import type { PendingPost } from "./createPendingPost"
import type { OwnerPendingPostsInfiniteData } from "./pendingPostCache"

const mocks = vi.hoisted(() => ({
  createPendingPost: vi.fn(),
  deleteOwnerPendingPost: vi.fn(),
}))

vi.mock("./createPendingPost", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./createPendingPost")>()
  return {
    ...actual,
    createPendingPost: mocks.createPendingPost,
  }
})

vi.mock("./deleteOwnerPendingPost", () => ({
  deleteOwnerPendingPost: mocks.deleteOwnerPendingPost,
  isOwnerPendingPostNotFoundError: (error: unknown) => {
    const value = error as { status?: number; code?: string }
    return value.status === 404 || value.code === "PENDING_POST_NOT_FOUND"
  },
}))

import { useDeleteOwnerPendingPost } from "./useDeleteOwnerPendingPost"
import { useCreatePendingPost } from "./useCreatePendingPost"

const post = (
  id: string,
  status: PendingPost["status"] = "PENDING",
) => ({ _id: id, status }) as PendingPost

function data(ids: string[]): OwnerPendingPostsInfiniteData {
  return {
    pageParams: [1],
    pages: [
      {
        success: true,
        data: ids.map((id) => post(id)),
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
  const profileKey = queryKeys.profiles.detail("profile-1")
  const profile = {
    _id: "profile-1",
    listingSummary: {
      activeCount: 1,
      pendingCount: 1,
      rejectedCount: 0,
    },
  }
  queryClient.setQueryData(allKey, data(["post-1", "post-2"]))
  queryClient.setQueryData(pendingKey, data(["post-1"]))
  queryClient.setQueryData(queryKeys.profiles.me, profile)
  queryClient.setQueryData(profileKey, profile)
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
  return {
    ...hook,
    allKey,
    pendingKey,
    profile,
    profileKey,
    queryClient,
    unrelatedKey,
  }
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
    mocks.createPendingPost.mockReset()
    mocks.deleteOwnerPendingPost.mockReset()
  })

  it("optimistically removes every related variant and preserves unrelated data", async () => {
    let resolveRequest!: (post: PendingPost) => void
    mocks.deleteOwnerPendingPost.mockReturnValue(
      new Promise<PendingPost>((resolve) => {
        resolveRequest = resolve
      }),
    )
    const {
      result,
      queryClient,
      allKey,
      pendingKey,
      profileKey,
      unrelatedKey,
    } = setup()
    const cancel = vi.spyOn(queryClient, "cancelQueries")

    act(() => result.current.mutate("post-1"))

    await waitFor(() => expect(ids(queryClient, allKey)).toEqual(["post-2"]))
    expect(cancel).toHaveBeenCalledWith({
      queryKey: queryKeys.pendingPosts.ownerLists,
    })
    expect(ids(queryClient, pendingKey)).toEqual([])
    expect(queryClient.getQueryData(profileKey)).toMatchObject({
      listingSummary: { pendingCount: 0 },
    })
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
    const {
      result,
      queryClient,
      allKey,
      pendingKey,
      profile,
      profileKey,
    } = setup()

    act(() => result.current.mutate("post-1"))
    await waitFor(() => expect(ids(queryClient, allKey)).toEqual(["post-2"]))

    await act(async () => rejectRequest(new Error("Network failure")))

    await waitFor(() =>
      expect(ids(queryClient, allKey)).toEqual(["post-1", "post-2"]),
    )
    expect(ids(queryClient, pendingKey)).toEqual(["post-1"])
    expect(queryClient.getQueryData(profileKey)).toEqual(profile)
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

  it("invalidates owner and admin pending-post families after success", async () => {
    mocks.deleteOwnerPendingPost.mockResolvedValue(post("post-1"))
    const { result, queryClient } = setup()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate("post-1"))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.pendingPosts.ownerLists,
      refetchType: "active",
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.admin.pendingPosts.lists,
      refetchType: "active",
    })
    expect(invalidate).toHaveBeenCalledTimes(2)
  })

  it("uses canonical server status when the post is absent from cache", async () => {
    mocks.deleteOwnerPendingPost.mockResolvedValue(post("post-1"))
    const { result, queryClient, profileKey } = setup()
    queryClient.removeQueries({
      queryKey: queryKeys.pendingPosts.ownerLists,
    })

    act(() => result.current.mutate("post-1"))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(queryClient.getQueryData(profileKey)).toMatchObject({
      listingSummary: { pendingCount: 0 },
    })
  })

  it("decrements the rejected counter for rejected posts", async () => {
    let resolve!: (post: PendingPost) => void
    mocks.deleteOwnerPendingPost.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const { result, queryClient, allKey, profileKey } = setup()
    queryClient.setQueryData(allKey, {
      pageParams: [1],
      pages: [{
        success: true,
        data: [post("post-1", "REJECTED")],
        pagination: { page: 1, limit: 20, total: 1 },
      }],
    })
    const rejectedProfile = {
      _id: "profile-1",
      listingSummary: {
        activeCount: 1,
        pendingCount: 2,
        rejectedCount: 1,
      },
    }
    queryClient.setQueryData(queryKeys.profiles.me, rejectedProfile)
    queryClient.setQueryData(profileKey, rejectedProfile)

    act(() => result.current.mutate("post-1"))
    await waitFor(() =>
      expect(queryClient.getQueryData(profileKey)).toMatchObject({
        listingSummary: { pendingCount: 2, rejectedCount: 0 },
      }),
    )

    await act(async () => resolve(post("post-1", "REJECTED")))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it("does not change profile counters for approved posts", async () => {
    let resolve!: (post: PendingPost) => void
    mocks.deleteOwnerPendingPost.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const { result, queryClient, allKey, profile, profileKey } = setup()
    queryClient.setQueryData(allKey, {
      pageParams: [1],
      pages: [{
        success: true,
        data: [post("post-1", "APPROVED")],
        pagination: { page: 1, limit: 20, total: 1 },
      }],
    })

    act(() => result.current.mutate("post-1"))
    await waitFor(() =>
      expect(mocks.deleteOwnerPendingPost).toHaveBeenCalledTimes(1),
    )
    expect(queryClient.getQueryData(profileKey)).toEqual(profile)

    await act(async () => resolve(post("post-1", "APPROVED")))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(profileKey)).toEqual(profile)
  })

  it("adjusts a profile that enters the cache while deletion is pending", async () => {
    let resolve!: (post: PendingPost) => void
    mocks.deleteOwnerPendingPost.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const { result, queryClient, profile, profileKey } = setup()
    queryClient.removeQueries({ queryKey: queryKeys.profiles.all })

    act(() => result.current.mutate("post-1"))
    await waitFor(() =>
      expect(mocks.deleteOwnerPendingPost).toHaveBeenCalledTimes(1),
    )
    queryClient.setQueryData(queryKeys.profiles.me, profile)
    queryClient.setQueryData(profileKey, profile)

    await act(async () => resolve(post("post-1")))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(profileKey)).toMatchObject({
      listingSummary: { pendingCount: 0 },
    })
  })

  it("does not call the endpoint or alter counters when cancellation fails", async () => {
    const { result, queryClient, profile, profileKey } = setup()
    vi.spyOn(queryClient, "cancelQueries").mockRejectedValueOnce(
      new Error("Cancellation failed"),
    )

    act(() => result.current.mutate("post-1"))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mocks.deleteOwnerPendingPost).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(profileKey)).toEqual(profile)
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

  it("serializes deletion with creation because both update shared counters", async () => {
    let resolveDelete!: (post: PendingPost) => void
    mocks.deleteOwnerPendingPost.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDelete = resolve
        }),
    )
    mocks.createPendingPost.mockResolvedValue(post("post-3"))
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    })

    function Wrapper({ children }: PropsWithChildren) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
    }

    const { result } = renderHook(
      () => ({
        create: useCreatePendingPost(),
        delete: useDeleteOwnerPendingPost(),
      }),
      { wrapper: Wrapper },
    )

    act(() => {
      result.current.delete.mutate("post-1")
      result.current.create.mutate({
        existingBuildingId: "building-1",
        listing: { rent: 9_000 },
      } as never)
    })
    await waitFor(() =>
      expect(mocks.deleteOwnerPendingPost).toHaveBeenCalledTimes(1),
    )
    expect(mocks.createPendingPost).not.toHaveBeenCalled()

    await act(async () => resolveDelete(post("post-1")))
    await waitFor(() =>
      expect(mocks.createPendingPost).toHaveBeenCalledTimes(1),
    )
  })
})
