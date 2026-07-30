import type { PropsWithChildren } from "react"
import { act, renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { queryKeys } from "@/lib/query-keys"

import type { PendingPost } from "./createPendingPost"
import type { OwnerPendingPostsInfiniteData } from "./pendingPostCache"

const mocks = vi.hoisted(() => ({ createPendingPost: vi.fn() }))
vi.mock("./createPendingPost", () => ({
  createPendingPost: mocks.createPendingPost,
}))

import { useCreatePendingPost } from "./useCreatePendingPost"

const input = {
  existingBuildingId: "building-1",
  listing: { rent: 9000 },
} as never
const pendingPost = {
  _id: "pending-2",
  status: "PENDING",
  submittedBy: "user-1",
} as PendingPost
const existingPost = { _id: "pending-1", status: "PENDING" } as PendingPost

function pendingData(posts: PendingPost[]): OwnerPendingPostsInfiniteData {
  return {
    pageParams: [1],
    pages: [
      {
        success: true,
        data: posts,
        pagination: { page: 1, limit: 20, total: posts.length },
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
    status: "PENDING",
    limit: 20,
  })
  const rejectedKey = queryKeys.pendingPosts.ownerList({
    status: "REJECTED",
    limit: 20,
  })
  const profileKey = queryKeys.profiles.detail("profile-1")
  const profile = {
    _id: "profile-1",
    listingSummary: { activeCount: 1, pendingCount: 1, rejectedCount: 0 },
  }
  queryClient.setQueryData(allKey, pendingData([existingPost]))
  queryClient.setQueryData(pendingKey, pendingData([existingPost]))
  queryClient.setQueryData(rejectedKey, pendingData([]))
  queryClient.setQueryData(queryKeys.profiles.me, profile)
  queryClient.setQueryData(profileKey, profile)

  function Wrapper({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  return {
    ...renderHook(() => useCreatePendingPost(), { wrapper: Wrapper }),
    allKey,
    pendingKey,
    profile,
    profileKey,
    queryClient,
    rejectedKey,
  }
}

function ids(queryClient: QueryClient, queryKey: readonly unknown[]) {
  return queryClient
    .getQueryData<OwnerPendingPostsInfiniteData>(queryKey)
    ?.pages.flatMap((page) => page.data.map((post) => post._id))
}

describe("useCreatePendingPost", () => {
  beforeEach(() => {
    mocks.createPendingPost.mockReset()
  })

  it("updates summaries optimistically and inserts only the canonical post", async () => {
    let resolve!: (post: PendingPost) => void
    mocks.createPendingPost.mockImplementation(
      () => new Promise((done) => { resolve = done }),
    )
    const {
      result,
      queryClient,
      allKey,
      pendingKey,
      rejectedKey,
      profileKey,
    } = setup()
    const cancel = vi.spyOn(queryClient, "cancelQueries")
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    act(() => result.current.mutate(input))
    await waitFor(() => expect(mocks.createPendingPost).toHaveBeenCalledOnce())
    expect(
      queryClient.getQueryData<{
        listingSummary: { pendingCount: number }
      }>(queryKeys.profiles.me)?.listingSummary.pendingCount,
    ).toBe(2)
    expect(ids(queryClient, allKey)).toEqual(["pending-1"])
    expect(cancel).toHaveBeenCalledTimes(3)

    await act(async () => resolve(pendingPost))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(ids(queryClient, allKey)).toEqual(["pending-2", "pending-1"])
    expect(ids(queryClient, pendingKey)).toEqual(["pending-2", "pending-1"])
    expect(ids(queryClient, rejectedKey)).toEqual([])
    expect(
      queryClient.getQueryData<{
        listingSummary: { pendingCount: number }
      }>(profileKey)?.listingSummary.pendingCount,
    ).toBe(2)
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.admin.pendingPosts.lists,
      refetchType: "active",
    })
  })

  it("restores every related snapshot on failure", async () => {
    mocks.createPendingPost.mockRejectedValue(new Error("Network error"))
    const { result, queryClient, allKey, profile } = setup()

    await expect(
      act(async () => result.current.mutateAsync(input)),
    ).rejects.toThrow("Network error")

    expect(queryClient.getQueryData(queryKeys.profiles.me)).toEqual(profile)
    expect(ids(queryClient, allKey)).toEqual(["pending-1"])
  })

  it("serializes repeated submissions", async () => {
    let resolveFirst!: (post: PendingPost) => void
    mocks.createPendingPost
      .mockImplementationOnce(
        () => new Promise((resolve) => { resolveFirst = resolve }),
      )
      .mockResolvedValueOnce(pendingPost)
    const { result } = setup()

    act(() => {
      result.current.mutate(input)
      result.current.mutate(input)
    })
    await waitFor(() => expect(mocks.createPendingPost).toHaveBeenCalledTimes(1))
    await act(async () => resolveFirst(pendingPost))
    await waitFor(() => expect(mocks.createPendingPost).toHaveBeenCalledTimes(2))
  })

  it("does not call the endpoint or increment counters when cancellation fails", async () => {
    const { result, queryClient, profile, profileKey } = setup()
    vi.spyOn(queryClient, "cancelQueries").mockRejectedValueOnce(
      new Error("Cancellation failed"),
    )

    act(() => result.current.mutate(input))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(mocks.createPendingPost).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(queryKeys.profiles.me)).toEqual(profile)
    expect(queryClient.getQueryData(profileKey)).toEqual(profile)
  })

  it("increments a profile that enters the cache while creation is pending", async () => {
    let resolve!: (post: PendingPost) => void
    mocks.createPendingPost.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const { result, queryClient, profile, profileKey } = setup()
    queryClient.removeQueries({ queryKey: queryKeys.profiles.all })

    act(() => result.current.mutate(input))
    await waitFor(() =>
      expect(mocks.createPendingPost).toHaveBeenCalledTimes(1),
    )
    queryClient.setQueryData(queryKeys.profiles.me, profile)
    queryClient.setQueryData(profileKey, profile)

    await act(async () => resolve(pendingPost))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(queryClient.getQueryData(profileKey)).toMatchObject({
      listingSummary: { pendingCount: 2 },
    })
  })

  it("reconciles a list refetched while creation is pending without duplicates", async () => {
    let resolve!: (post: PendingPost) => void
    mocks.createPendingPost.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const { result, queryClient, allKey, pendingKey } = setup()

    act(() => result.current.mutate(input))
    await waitFor(() =>
      expect(mocks.createPendingPost).toHaveBeenCalledTimes(1),
    )
    queryClient.setQueryData(
      allKey,
      pendingData([pendingPost, existingPost]),
    )
    queryClient.setQueryData(
      pendingKey,
      pendingData([pendingPost, existingPost]),
    )

    await act(async () => resolve(pendingPost))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(ids(queryClient, allKey)).toEqual(["pending-2", "pending-1"])
    expect(ids(queryClient, pendingKey)).toEqual([
      "pending-2",
      "pending-1",
    ])
    expect(
      queryClient.getQueryData<OwnerPendingPostsInfiniteData>(allKey)
        ?.pages[0].pagination.total,
    ).toBe(2)
  })

  it("succeeds safely with malformed and fully evicted caches", async () => {
    mocks.createPendingPost.mockResolvedValue(pendingPost)
    const { result, queryClient, allKey, profileKey } = setup()
    const malformed = {
      pageParams: [1],
      pages: [{ data: null }],
    }
    queryClient.setQueryData(allKey, malformed)
    queryClient.removeQueries({ queryKey: queryKeys.profiles.all })

    act(() => result.current.mutate(input))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(queryClient.getQueryData(allKey)).toEqual(malformed)
    expect(
      queryClient.getQueryCache().find({
        queryKey: profileKey,
        exact: true,
      }),
    ).toBeUndefined()
  })

  it("normalizes a non-finite pending counter before incrementing", async () => {
    let resolve!: (post: PendingPost) => void
    mocks.createPendingPost.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const { result, queryClient, profileKey } = setup()
    const malformedProfile = {
      _id: "profile-1",
      listingSummary: {
        activeCount: 1,
        pendingCount: Number.NaN,
        rejectedCount: 0,
      },
    }
    queryClient.setQueryData(queryKeys.profiles.me, malformedProfile)
    queryClient.setQueryData(profileKey, malformedProfile)

    act(() => result.current.mutate(input))
    await waitFor(() =>
      expect(queryClient.getQueryData(profileKey)).toMatchObject({
        listingSummary: { pendingCount: 1 },
      }),
    )

    await act(async () => resolve(pendingPost))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })
})
